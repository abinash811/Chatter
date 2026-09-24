import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

// ADR 0006: email + password, superseding Google OAuth (ADR 0004) —
// OAuth requires an external app registered with the provider before
// anything works even locally, which was pure friction during setup.
// JWT sessions, no Prisma adapter — same reasoning as before: our own
// User/Membership shape isn't Auth.js's expected schema, so identity
// resolution happens in the jwt callback against our own tables.
//
// User has no orgId column and isn't RLS-protected (it's not tenant
// data — the same email can belong to several orgs). "Which org does
// this user belong to" is resolved via UserOrgAccess, an index table
// deliberately exempt from RLS for the same reason BotPublicKey is
// (see prisma/schema.prisma) — you can't require org context to
// discover org context.

const rawClient = new PrismaClient();

const { handlers, auth: nextAuth, signIn, signOut } = NextAuth({
  // Auth.js refuses to trust a Host header it hasn't verified (Host
  // header injection protection) unless told to — needed for any
  // deployment behind a reverse proxy (Render) and for localhost dev,
  // neither of which Auth.js trusts automatically. Caught by actually
  // running the login/signup flow: signIn() silently failed with
  // UntrustedHost until this was added.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await rawClient.user.findUnique({ where: { email } });
        if (!user || !verifyPassword(password, user.passwordHash)) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only populated on the sign-in request itself (from
      // authorize's return value above) — token refreshes on later
      // requests pass the existing token through unchanged.
      if (!user?.id) return token;
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
        await tx.org.create({ data: { id: orgId, name: `${user.email}'s workspace` } });
        await tx.membership.create({ data: { orgId, userId: user.id!, role: "owner" } });
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

// Not part of Auth.js — Credentials only verifies existing users, it
// has no concept of registration. Called by app/signup/page.tsx's
// server action, which then calls signIn("credentials", ...) itself to
// establish a session immediately after.
export async function createUser(email: string, password: string): Promise<{ id: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await rawClient.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  const user = await rawClient.user.create({
    data: { email: normalizedEmail, passwordHash: hashPassword(password) },
  });
  return { id: user.id };
}

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
