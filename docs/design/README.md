# Chatter design previews

Static HTML mockups — the visual ground truth for a page before it's built
in code. Adopted from a sister project's practice (a mature pharmacy-SaaS
codebase) after Chatter's first `/login` page shipped as a bare, unstyled
centered form with no design pass at all.

**Rule** (see CLAUDE.md): before building any new page or UI pattern,
check `preview/` first. If a preview exists, match it. If none exists,
follow the token/component rules in `docs/design/design-system.md`
(the consolidated real values) and `docs/architecture.md` §7, then add
a preview here after shipping.

Unlike `app/globals.css` (the real, referenced tokens), these preview
files hardcode color/type values — they're throwaway visual references,
not code, so `check-design-tokens.mjs` doesn't scan them. Keep the values
in sync with `app/globals.css` by hand when tokens change.

**Known gap (ADR 0014, 2026-09-26):** the token swap off CARE's emerald/
indigo palette to shadcn's neutral one hasn't been back-ported into
these HTML files yet — every preview below still shows the old CARE
colors, stale against what the real app now renders. Not urgent (these
are static reference mockups, not runtime code — nothing breaks), but
real drift; update each file's hardcoded values the next time that
screen is touched, same as the file-by-file component migration.

## Files

```
preview/
  auth.html           ✅ Approved — /login and /signup split layout (components/auth/AuthShell.tsx)
  bots-list.html      ✅ Approved — /bots (app/(console)/bots/page.tsx), rebuilt on the real CARE Table (components/console/BotsTable.tsx, ADR 0008) — column headers, whole-row click
  bot-editor.html     ✅ Approved — bot editor rebuilt on principles.md #10's page-composition pattern (BotEditorForm.tsx): persistent top bar, real Tabs (not stacked Cards), Dialog confirmation before Publish; embed snippet now lives inside the Appearance tab. Notion-register depth/polish pass (principles.md #4/#5/#9, working from real Linear/Notion/Stripe knowledge, not CARE reference — see ADR 0011): Card is a soft-tinted recessed panel (not a plain white box with a border) with white fields popping inside it, bigger CardTitle for real section hierarchy, more generous padding; Input/Textarea/Checkbox given real shadow+hover states to match Button's existing polish
  console-shell.html  ✅ Shipped — the sidebar nav shell shared by every console page (app/(console)/layout.tsx, components/console/AppSidebar.tsx) — real CARE Sidebar, icon-collapsible, ADR 0008/0009
  knowledge.html      ✅ Shipped — /bots/[botId]/knowledge (KnowledgeForm.tsx, KnowledgeTable.tsx): Q&A/file/URL ingestion (ADR 0013), a real CARE Table list generalized to Title/Type/Chunks/Created (Linear register) + one "Add" DropdownMenu behind three Dialogs — AddQaDialog/AddFileDialog/AddUrlDialog (Notion register, ADR 0011) — same list/compose split as bots-list.html/bot-editor.html
  onboarding.html     ✅ Shipped — /onboarding (OnboardingForm.tsx, ADR 0012): a single combined Card (workspace name + first bot name), no template picker or invites — see the ADR for why not
  settings.html       ✅ Shipped — /settings (SettingsForm.tsx, ADR 0012): workspace name + optional BYOA (bring-your-own Claude API key), progressive disclosure per principles.md #7 — never echoes the real key back once set
```

See `docs/design/principles.md` for the bar these previews (and their
implementations) are checked against.
