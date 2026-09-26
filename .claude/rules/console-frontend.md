---
paths:
  - "app/(console)/**"
  - "components/ui/**"
---

# Console frontend build

Loads automatically when touching `app/(console)/` or `components/ui/`
— a console page, a UI primitive, a form/server action. Enforces the
design-token system and the register (Linear/Notion/Stripe) mapping
from `docs/architecture.md` §7. (Converted from a skill to a
path-scoped rule 2026-09-26 so it loads deterministically instead of
depending on the model choosing to invoke it — see
`code.claude.com/docs/en/memory`'s `.claude/rules/` mechanism.)

1. **Never hardcode a color.** No hex codes, no Tailwind arbitrary color
   classes (`bg-red-500`, `text-blue-600`). Use a token —
   `bg-accent`, `text-muted-foreground`, `border-border`, etc. — defined
   once in `app/globals.css`. `scripts/check-design-tokens.mjs` enforces
   this at commit time. If the token you need doesn't exist, add it to
   `globals.css`, don't reach for a raw value.

   **The subtler version of this mistake**: reusing an *existing* token
   for a meaning it wasn't designed for, because the right one doesn't
   exist yet — e.g. rendering "Published" with the same neutral badge
   token as "Draft" because no `--success` color exists. That's a
   system gap, not a screen bug. Check `docs/design/audit.md`'s "System
   coverage" table before improvising; if the semantic color/variant you
   need isn't there, add it at the token/primitive layer and log the row,
   don't silently borrow the nearest neutral token as a stand-in.

2. **Reuse `components/ui/` primitives** (`Button`, `Input`, `Textarea`,
   `Label`, `Checkbox`, `Badge`, `Card`/`CardHeader`/`CardTitle`/
   `CardDescription`/`CardContent`, `Toaster`, and whatever's added
   since — import from the barrel, `@/components/ui`, not a specific
   file) instead of a one-off styled element. If a new primitive is
   genuinely needed, add it there following the existing `cn()`
   pattern (`cva` too, if it has real variants), not inline in the
   page — see `docs/conventions.md`.

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
   flags any `"use client"` file referencing a secret-looking env var —
   several client components exist now (auth forms, `BotEditorForm`,
   `Toaster`), so this is a live, checked rule, not a hypothetical one.

6. **Run the canary before committing anything that changes a route or
   layout**: `npm run build && npm run start &` then `npm run canary` —
   it catches hydration/runtime errors a type-check can't. See
   `scripts/canary.mjs`.

7. **Check the screen below ~900px wide and tab through it with a mouse
   untouched, before calling it done.** Found 2026-09-26 as a total
   blind spot — only 6 files in the app use any responsive Tailwind
   prefix, every `tests/visual/` baseline is a fixed 1280×800, and only
   one screen had ever had a real keyboard-only pass. Log the result in
   `docs/design/audit.md`'s "Responsive & accessibility" table even when
   it's "not checked" — see `ship-checklist` item 13 for the full
   design-bar self-check this is part of.
