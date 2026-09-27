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
   `bg-primary`, `text-muted-foreground`, `border-border`, etc. — defined
   once in `app/globals.css`. `scripts/check-design-tokens.mjs` enforces
   this at commit time. If the token you need doesn't exist, add it to
   `globals.css`, don't reach for a raw value.

   **The subtler version of this mistake**: using a token for a meaning
   it wasn't designed for, because it *sounds* right, without checking
   what it actually resolves to. `--accent` is a real, correct token for
   a hover-tint background (`hover:bg-accent`) — but ADR 0014 redefined
   it to `oklch(97%)`, a pale near-white, and it was then reused as a
   *fill/text* color in `Badge`'s `default` variant, an avatar chip, and
   the sidebar's brand-icon chip — all three nearly invisible as a
   result, not caught until a real screenshot was checked by hand
   (`docs/design/audit.md`'s "System coverage" table, 2026-09-27
   correction). The fix in all three cases was `bg-primary` — a token
   already existed, it just needed to be the *right* one, not a new one
   invented for the occasion. Check what a token's current value
   actually is (`app/globals.css`) before reusing it for a new purpose,
   and check `docs/design/audit.md`'s "System coverage" table before
   assuming a semantic meaning has nothing to reach for at all.

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

8. **Take a real screenshot and critique it like a senior product
   designer before calling any touched screen done** — not just the
   hover/focus/active/loading checklist above, the whole bar from
   `docs/design/principles.md` #9 ("would this ship at Linear, Stripe,
   or Notion"). Added 2026-09-27 after shipping bots-list search/sort/
   archive without re-checking a screen that already had open findings
   against it: functionality can be fully correct and tested while the
   screen still reads as unfinished. Look specifically for:
   - **Hierarchy** — does the eye know what to read first, or do name/
     status/metadata all carry equal visual weight?
   - **Status/semantic signaling** — does a badge, color, or icon that's
     supposed to distinguish states (published vs. draft, error vs. ok)
     actually read as different at a glance, not just in the DOM?
   - **Per-item visual distinction** — in a list, can items be told
     apart by anything other than reading the text (avatar color,
     icon, accent)?
   - **Content density vs. register** — does whitespace match the
     Linear/Notion/Stripe register chosen in item 3, or does a mostly-
     empty card/page suggest no deliberate density decision was made?
   - **Interactive-affordance clarity** — does a clickable control
     (sort header, filter, menu trigger) visibly invite the interaction
     at rest, or does a user have to discover it exists?

   **If the screen you're touching already has open findings logged in
   `docs/design/audit.md`, fixing them is part of this pass by
   default** — don't ship new functionality next to a known-broken
   visual element and leave it silently unaddressed. If you're
   deliberately not fixing one (out of scope, needs a product decision),
   say so explicitly to the user in the same turn, don't let it pass by
   omission. Log the outcome in `docs/design/audit.md` either way.
