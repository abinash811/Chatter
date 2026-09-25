# API reference

Every HTTP route, one place — update this in the same PR that adds or
changes one. Console pages (`app/(console)/`) use server actions, not
these routes, so they're not listed here; this covers what's reachable
over HTTP from outside a page render.

## Public widget routes

No auth — identity comes entirely from an opaque `botKey`, resolved
server-side (`resolveBotPublicKey`, see `docs/business-logic.md`). Both
are rate-limited per IP (`lib/rateLimit.ts`, `docs/security.md`) and
always return CORS headers, including on error (`lib/widgetCors.ts`).

### `POST /api/chat`

Send a visitor's message, get the bot's reply.

**Request body**
```json
{ "botKey": "string (required)", "conversationId": "string (optional — omit to start a new conversation)", "message": "string (required)" }
```

**Response `200`**
```json
{ "conversationId": "string", "reply": "string" }
```

**Errors**: `400` missing `botKey`/`message` · `401` invalid `botKey` ·
`429` rate limit (20/min per IP) · `500` generic failure (real error
logged server-side, never leaked to this public endpoint)

### `GET /api/widget/config?botKey=...`

Cosmetic config the widget needs before rendering (greeting text,
accent color) — never persona/guardrails/anything internal
(guardrail #5).

**Response `200`**
```json
{ "greeting": "string", "accentColor": "string (hex)" }
```

**Errors**: `400` missing `botKey` · `401` invalid `botKey` · `429` rate
limit (60/min per IP) · `500` generic failure

## Console-adjacent routes

### `GET /api/integrations/[provider]/callback`

OAuth callback for connecting a business's platform (Shopify today).
Never touches the console session — `state` (set when the authorize URL
was built) carries `orgId`/`botId` through the redirect; see
`docs/business-logic.md`. Redirects to `/bots/{botId}/integrations` on
completion, doesn't return JSON.

### `ALL /api/auth/[...nextauth]`

Auth.js's own catch-all (session, credentials sign-in/sign-out). Not
individually documented here — see `lib/auth.ts` and ADR 0006; Auth.js
owns this route's exact request/response shapes.
