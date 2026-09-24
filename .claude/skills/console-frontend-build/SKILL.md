---
name: console-frontend-build
description: Use before writing or modifying anything under app/(console)/ or components/ui/ — a console page, a UI primitive, a form/server action. Enforces the design-token system and the register (Linear/Notion/Stripe) mapping from docs/architecture.md §7.
---

# Console frontend build

Before writing a console screen or component:

1. **Never hardcode a color.** No hex codes, no Tailwind arbitrary color
   classes (`bg-red-500`, `text-blue-600`). Use a token —
   `bg-accent`, `text-muted-foreground`, `border-border`, etc. — defined
   once in `app/globals.css`. `scripts/check-design-tokens.mjs` enforces
   this at commit time. If the token you need doesn't exist, add it to
   `globals.css`, don't reach for a raw value.

2. **Reuse `components/ui/` primitives** (`Button`, `Badge`, and
   whatever's added since) instead of a one-off styled element. If a new
   primitive is genuinely needed, add it there following the existing
   `cva` + `cn()` pattern, not inline in the page.

3. **Match the register to the surface**, per docs/architecture.md §7:
   - Daily-driver screens (bot list, conversation inbox, analytics) →
     Linear register: dense, `h-row`/`h-row-sm`, minimal decoration.
   - Configuration/creative surfaces (persona/guardrails editing,
     knowledge base entry) → Notion register: calm, generous spacing,
     plain-language labels — see `app/(console)/bots/[botId]/page.tsx`.
   - Anything touching a business's real data/credentials (integrations,
     billing) → Stripe register: restrained, no decoration for its own
     sake.

4. **Auth check belongs in the layout, not the page.** Every page under
   `app/(console)/` is already covered by `app/(console)/layout.tsx`'s
   `getCurrentSession()` check — don't duplicate it per page. A page
   still calls `getCurrentSession()` itself when it needs the actual
   session values (`orgId`), which is expected and fine.

5. **No client-side secrets, ever.** `scripts/check-no-client-secrets.mjs`
   flags any `"use client"` file referencing a secret-looking env var.
   This project has no client components yet — if you're adding the
   first one, this is exactly the guardrail it exists for.

6. **Run the canary before committing anything that changes a route or
   layout**: `npm run build && npm run start &` then `npm run canary` —
   it catches hydration/runtime errors a type-check can't. See
   `scripts/canary.mjs`.
