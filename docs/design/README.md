# Chatter design previews

Static HTML mockups — the visual ground truth for a page before it's built
in code. Adopted from a sister project's practice (a mature pharmacy-SaaS
codebase) after Chatter's first `/login` page shipped as a bare, unstyled
centered form with no design pass at all.

**Rule** (see CLAUDE.md): before building any new page or UI pattern,
check `preview/` first. If a preview exists, match it. If none exists,
follow the token/component rules already in `docs/architecture.md` §7 and
`app/globals.css`, then add a preview here after shipping.

Unlike `app/globals.css` (the real, referenced tokens), these preview
files hardcode color/type values — they're throwaway visual references,
not code, so `check-design-tokens.mjs` doesn't scan them. Keep the values
in sync with `app/globals.css` by hand when tokens change.

## Files

```
preview/
  auth.html    ✅ Approved — /login and /signup split layout (components/auth/AuthShell.tsx)
```
