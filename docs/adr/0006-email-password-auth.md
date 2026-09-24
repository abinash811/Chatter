# ADR 0006: Console auth — switch from Google OAuth to email + password

Status: accepted

Date: 2026-09-24

## Context

ADR 0004 chose Google OAuth. In practice it added real local-dev friction
that a solo/small-team build doesn't need yet: every developer running
this locally needs their own Google Cloud Console app registered before
`/login` works at all, and the redirect URI has to be updated by hand
whenever the app's URL changes (Render preview URLs, a new dev's
`localhost` port). Testing this session hit exactly that wall — Google
OAuth couldn't be exercised locally without an app the user hadn't set
up, and there was no way to sign up at all (Auth.js's Credentials
provider, which we now use, only verifies existing users — Google OAuth
provisions the user account implicitly on first sign-in, so with it
there had never been a dedicated signup page or flow).

## Decision

- **Provider**: Auth.js `Credentials`, not an OAuth provider. The
  `authorize()` callback verifies email + password against `User.
  passwordHash`.
- **Password storage**: Node's built-in `crypto.scrypt` (`lib/
  password.ts`) — a memory-hard KDF, salted per-user, no plaintext or
  reversible storage. Deliberately not bcrypt/argon2: both need a native
  binary, and this session already hit real native-dependency friction
  once (Homebrew's pgvector bottle only targeting specific Postgres
  majors). scrypt ships in Node core, so there's nothing to install.
- **Registration**: a new `createUser(email, password)` function in
  `lib/auth.ts`, called from `app/signup/page.tsx`'s server action, then
  immediately followed by `signIn("credentials", ...)` so a new user
  lands in the console in one step, matching what Google OAuth's
  first-login flow used to do.
- **Everything else about ADR 0004 is unchanged**: JWT sessions (no
  Auth.js Prisma adapter, no `Session` table), and `UserOrgAccess`-based
  org auto-provisioning on first login. Only the identity-verification
  step (`authorize`) changed, not the session/org-resolution model
  around it.

## Alternatives considered

- **Keep Google OAuth, just fix the setup friction** — rejected. The
  friction is inherent to OAuth (an external app registration is always
  required, for every developer, on every environment URL), not a
  one-time setup bug to fix.
- **Magic link (passwordless email)** — not chosen; adds an email-
  sending dependency (and its own deliverability/local-dev friction —
  previewing a sent email locally is its own problem) for a security
  property (no password to leak) this MVP doesn't need yet.
- **bcrypt/argon2** — rejected in favor of `crypto.scrypt` specifically
  to avoid a native-binary dependency, given the pgvector precedent this
  session.

## Consequences

- No external app registration or dashboard config needed for console
  login to work, locally or on Render — one less env var pair
  (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) everywhere they appeared
  (`.env.example`, `render.yaml`, `.github/workflows/ci.yml`, README).
- We now own password storage and its risk surface directly — a stolen
  `passwordHash` column is a real credential-stuffing risk (mitigated by
  scrypt being slow/memory-hard to brute-force, but not eliminated).
  Google OAuth had no such risk since we never held a credential.
- No password reset flow exists yet (a locked-out user has no self-
  service recovery path) — this is new work OAuth never needed, and
  isn't built yet. Flagging as a gap, not blocking this ADR: v1 has no
  users yet to lock out.
- This is a breaking change for any account created under ADR 0004 —
  Google-OAuth-created `User` rows have no `passwordHash` and can no
  longer log in. Acceptable now (no real users yet); would need a
  migration path if this happened post-launch.
