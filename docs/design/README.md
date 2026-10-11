# Chatter design previews

Static HTML mockups — the visual ground truth for a page **before** it's
built in code. Adopted from a sister project's practice (a mature
pharmacy-SaaS codebase) after Chatter's first `/login` page shipped as a
bare, unstyled centered form with no design pass at all.

**Rule** (see CLAUDE.md): before building any new page or UI pattern,
check `preview/` first. If a preview exists for a screen that *hasn't
shipped yet*, match it. If none exists, follow the token/component
rules in `docs/design/design-system.md` (the consolidated real values)
and `docs/architecture.md` §7, then add a preview here before shipping.

## Shipped screens' mockups are frozen, not maintained (2026-10-11)

**Every file below has already shipped** — there is currently no
mockup in this folder for an unbuilt screen. A shipped mockup is
**historical record, not a live reference**: once real code exists,
`design-system.md` + the real running app are the only authority, and
nobody goes back to update a shipped file's hardcoded colors/markup
when a token or a screen changes. This was already true in practice
(the "Known gap" note below sat unaddressed since 2026-09-26, and
`conversations.html` still describes the pre-ADR-0027 single-table
layout, not the real split-pane rebuild that shipped weeks later) — this
just makes it the documented policy instead of an ignored aspiration.

**What this means going forward**: don't open a shipped screen's
`preview/*.html` expecting it to match the real app, and don't spend
time back-porting token changes into it — that upkeep pass was never
actually happening and isn't worth starting now. The *process* for an
**unshipped** screen is unchanged: sketch it here first, get it
approved, build to match, and once it ships its entry below gets
relabeled 🧊 Frozen like the others — the file itself doesn't need
further edits after that point.

Unlike `app/globals.css` (the real, referenced tokens), these preview
files hardcode color/type values — they're throwaway visual references,
not code, so `check-design-tokens.mjs` doesn't scan them and never will.

## Files

```
preview/
  auth.html           🧊 Frozen (shipped) — /login and /signup split layout (components/auth/AuthShell.tsx)
  bots-list.html      🧊 Frozen (shipped) — /bots (app/(console)/bots/page.tsx), rebuilt on the real CARE Table (components/console/BotsTable.tsx, ADR 0008) — column headers, whole-row click
  bot-editor.html     🧊 Frozen (shipped) — bot editor rebuilt on principles.md #10's page-composition pattern (BotEditorForm.tsx): persistent top bar, real Tabs (not stacked Cards), Dialog confirmation before Publish; embed snippet now lives inside the Appearance tab. Notion-register depth/polish pass (principles.md #4/#5/#9, working from real Linear/Notion/Stripe knowledge, not CARE reference — see ADR 0011): Card is a soft-tinted recessed panel (not a plain white box with a border) with white fields popping inside it, bigger CardTitle for real section hierarchy, more generous padding; Input/Textarea/Checkbox given real shadow+hover states to match Button's existing polish
  console-shell.html  🧊 Frozen (shipped) — the sidebar nav shell shared by every console page (app/(console)/layout.tsx, components/console/AppSidebar.tsx) — real CARE Sidebar, icon-collapsible, ADR 0008/0009
  knowledge.html      🧊 Frozen (shipped) — /bots/[botId]/knowledge (KnowledgeForm.tsx, KnowledgeTable.tsx): Q&A/file/URL ingestion (ADR 0013), a real CARE Table list generalized to Title/Type/Chunks/Created (Linear register) + one "Add" DropdownMenu behind three Dialogs — AddQaDialog/AddFileDialog/AddUrlDialog (Notion register, ADR 0011) — same list/compose split as bots-list.html/bot-editor.html. Superseded in the real app by the 2026-09-29 "Data sources" rebuild (search/filter/sort/bulk-select, 4th text-snippet entry point) — this mockup predates that and was never updated, per the frozen-on-ship policy above.
  onboarding.html     🧊 Frozen (shipped) — /onboarding (OnboardingForm.tsx, ADR 0012): a single combined Card (workspace name + first bot name), no template picker or invites — see the ADR for why not
  settings.html       🧊 Frozen (shipped) — /settings (SettingsForm.tsx, ADR 0012): workspace name + optional BYOA (bring-your-own Claude API key), progressive disclosure per principles.md #7 — never echoes the real key back once set
  conversations.html  🧊 Frozen (shipped) — /conversations + /conversations/[conversationId] as they looked at ADR 0015/0016. Superseded in the real app by the 2026-09-29 split-pane Activity rebuild (ADR 0027) — this mockup predates that and was never updated, per the frozen-on-ship policy above.
```

See `docs/design/principles.md` for the bar real screens (not these
frozen mockups) are checked against — and `docs/design/audit.md` for
each screen's actual, current compliance state.
