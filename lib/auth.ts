// STUB — auth provider choice (magic link vs Google OAuth vs
// credentials) hasn't been decided; see docs/open-questions.md. This
// exists so console pages have one place to get the current user's org
// context from, and so that place is obviously not real yet, rather than
// a body-supplied orgId quietly reintroducing the exact bug fixed in
// app/api/chat/route.ts for the widget.
//
// Whatever auth is chosen, it must resolve org context from a verified
// server-side session — never trust a client-supplied orgId, same
// principle as BotPublicKey resolution for the widget.
export interface Session {
  userId: string;
  orgId: string;
}

export async function getCurrentSession(): Promise<Session> {
  throw new Error(
    "Auth not implemented yet — see docs/open-questions.md. Console pages " +
      "cannot resolve a real user/org until this is built.",
  );
}
