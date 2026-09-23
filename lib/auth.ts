import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { withOrgContext } from "@/lib/db";

// ADR 0004: Google OAuth via Auth.js (next-auth v5), JWT sessions.
//
// No Prisma adapter — our own User/Membership shape isn't Auth.js's
// expected schema, so identity resolution happens in the jwt callback
// against our own tables instead.
//
// User has no orgId column and isn't RLS-protected (it's not tenant
// data — the same email can belong to several orgs). "Which org does
// this user belong to" is resolved via UserOrgAccess, an index table
// deliberately exempt from RLS for the same reason BotPublicKey is
// (see prisma/schema.prisma) — you can't require org context to
// discover org context.

const rawClient = new PrismaClient();

const { handlers, auth: nextAuth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (!account || !token.email) return token;

      const user = await rawClient.user.upsert({
        where: { email: token.email },
        create: { email: token.email },
        update: {},
      });
      token.userId = user.id;

      const access = await rawClient.userOrgAccess.findFirst({ where: { userId: user.id } });
      if (access) {
        token.orgId = access.orgId;
        return token;
      }

      // First login for this user, no org yet — auto-provision one so
      // the console is usable immediately. TODO: replace with a real
      // onboarding flow (org name, invite teammates) — see
      // docs/open-questions.md. Multi-org-per-user (an agency managing
      // several stores) isn't reachable from login yet either; this
      // always takes the first org found.
      const orgId = randomUUID();
      await withOrgContext(orgId, async (tx) => {
        await tx.org.create({ data: { id: orgId, name: `${token.email}'s workspace` } });
        await tx.membership.create({ data: { orgId, userId: user.id, role: "owner" } });
      });
      await rawClient.userOrgAccess.create({ data: { userId: user.id, orgId } });

      token.orgId = orgId;
      return token;
    },
    async session({ session, token }) {
      return { ...session, userId: token.userId, orgId: token.orgId } as typeof session & {
        userId: string;
        orgId: string;
      };
    },
  },
});

export { handlers, signIn, signOut };

export interface Session {
  userId: string;
  orgId: string;
}

export async function getCurrentSession(): Promise<Session> {
  const session = await nextAuth();
  if (!session || !("orgId" in session) || !("userId" in session)) {
    throw new Error("Not authenticated");
  }
  return { userId: session.userId as string, orgId: session.orgId as string };
}
