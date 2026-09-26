# ADR 0012: Onboarding wizard + optional BYOA, with real encryption at rest

Status: accepted

Date: 2026-09-26

## Context

`docs/open-questions.md` #5 (BYOA) was previously deferred with a
recommendation: "default to our managed key for v1, add BYOA as a
per-business config option once the gateway exists — not v1-blocking."
The user has now explicitly asked to build it, alongside a self-serve
onboarding wizard.

`lib/auth.ts`'s `jwt` callback already carries a literal TODO: "replace
with a real onboarding flow (org name, invite teammates) — see
`docs/open-questions.md`." Today a brand-new user's org is silently
auto-provisioned (`"{email}'s workspace"`) and the user lands straight
on an empty `/bots` list — no guided setup, and no way to ever rename
the org (no settings page exists at all).

Separately, `prisma/schema.prisma`'s `Integration.accessToken` field
(Shopify OAuth tokens) has stood with a `// encrypted at rest —
encryption mechanism TODO` comment, unimplemented — real OAuth tokens
stored in plaintext. Adding BYOA means storing a business's own
Anthropic API key at rest, a more sensitive secret than a Shopify token
(direct billing exposure to the business's own Anthropic account if
leaked, not just store-scoped access). Building BYOA without finally
implementing real encryption would add a second, worse plaintext-secret
gap next to an already-flagged one — worth a recorded decision rather
than quietly repeating the same shortcut.

## Decision

**1. Onboarding**: a single combined screen (not a multi-step wizard)
collecting the organization's name and the first bot's name together,
replacing the silent auto-provision. Gated via a new nullable
`Org.onboardedAt` timestamp — null means "still needs onboarding."
`app/(console)/layout.tsx`'s existing auth-gate check is extended:
after resolving the session, if the org's `onboardedAt` is null,
redirect to `/onboarding` — a route deliberately outside the
`(console)` route group/layout, sibling to `/login` and `/signup`, so
it never triggers its own redirect loop and has no sidebar chrome
(matching how the auth pages already have none). Submitting the form
updates `org.name`, sets `onboardedAt` to now, creates the first bot
(same mechanics as the bots list's existing "New bot" form), and
redirects straight to that bot's editor — skipping a bare empty
`/bots` list on a brand-new account.

Explicitly **not** built in this pass: a vertical-template picker step
(`docs/product-spec.md`'s eventual "pick template → configure
knowledge → customize appearance → get embed snippet" wizard) — only
one template (ecommerce) concretely exists per the product-spec's own
phasing, so a picker with one option is premature UI. Also not built:
inviting teammates (multi-user orgs) — a separate, larger feature
(email invites, roles) with no design done yet.

**2. BYOA**: a nullable field on `Org`, not `Bot` — an Anthropic API
key is a billing-account-level credential a business brings, not
something that varies per bot the way a Shopify connection does;
keeping it on `Org` also means one gateway lookup per request, reused
across every bot in that org. A non-null value means "this org's bots
call Claude with their own key"; null (the default) means "use our
managed `ANTHROPIC_API_KEY`." `lib/ai/gateway.ts`'s `getModelGateway()`
gains an optional `apiKey` parameter, threaded through from
`lib/ai/chat.ts` (which already loads org context every request) — the
`ClaudeGateway` class passes it to the Anthropic SDK constructor when
present, falling back to the SDK's own env-var default otherwise. No
change to the `ModelGateway` interface shape itself, so this doesn't
touch the interface/connector split or any tool code. Exposed as an
optional field on a new `/settings` page (org name + this key), not
forced during onboarding — progressive disclosure, matches
`docs/design/principles.md` #7.

**3. Secrets are now actually encrypted at rest**, not left as a TODO:
a new `lib/crypto.ts` (Node's built-in `crypto` module, AES-256-GCM, no
new npm dependency) encrypts/decrypts using a new required
`ENCRYPTION_KEY` env var (a 32-byte key, base64-encoded, documented in
`.env.example` and README's setup steps). Applied to both the new
`Org.anthropicApiKeyEncrypted` field **and** retroactively to the
existing `Integration.accessToken` field, closing that field's
long-standing TODO in the same pass rather than adding a second
unencrypted-secret gap next to it. This is a breaking schema-level
change with no migration/backfill path for already-stored plaintext
tokens — acceptable because this is still pre-launch with no real
production data (README's own "Verified by a real run" language
confirms the project is still at the dev/verification stage).

## Alternatives considered

- **BYOA on `Bot` instead of `Org`** — rejected: an API key is
  billing-account-level, not bot-level; per-bot storage would mean
  re-fetching/decrypting once per bot instead of once per org.
- **Leave `Integration.accessToken`'s TODO alone, only encrypt the new
  Anthropic key** — rejected: would leave two inconsistent
  secret-storage approaches side by side for no reason once the
  mechanism exists.
- **A multi-step wizard with a template-picker screen now** — rejected
  as premature; only one template exists.
- **Defer encryption again, match the existing plaintext pattern** —
  rejected specifically because a leaked Anthropic key is direct
  financial exposure to the business, a materially worse failure mode
  than the Shopify-token status quo it would otherwise match.

## Consequences

- `ENCRYPTION_KEY` becomes a required env var for any real deployment
  (documented in `.env.example`/README, same treatment as
  `AUTH_SECRET`). Rotating it would require re-encrypting every stored
  secret — no rotation tooling exists yet; a known gap, not a v1
  blocker.
- The onboarding gate (`org.onboardedAt`) is easy to reverse — drop the
  check in `layout.tsx` — if ever needed.
- BYOA's per-org nullable-field design extends to per-bot later without
  a breaking migration if that granularity is ever needed — the
  org-level default just becomes the fallback.
- Not hard to reverse overall: this is additive (new nullable columns,
  a new route, a new optional gateway parameter), not a rework of
  existing tenant isolation, auth, or the model gateway's public shape.
