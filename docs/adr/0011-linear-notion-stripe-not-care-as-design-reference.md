# ADR 0011: CARE's live product is unreachable — work from documented Linear/Notion/Stripe knowledge instead

Status: accepted

Date: 2026-09-25

## Context

ADR 0010 moved from "pull CARE component source verbatim" to "use CARE's
real screens as a visual/behavioral reference, hand-author against our
own tokens." The user then raised a deeper problem: `care_fe`'s GitHub
repository is component *source code*, not a design artifact — reading
TSX/Tailwind classes doesn't tell us what a designer actually decided
about density, hierarchy, whitespace, or polish on a real, finished
screen. Code is not a substitute for looking at the actual product.

We then tried to fix this properly — get real visual reference of
CARE's actual live product, not just its code — via `WebSearch` and
`WebFetch`. Every avenue failed, and not for CARE-specific reasons:

- `care.ohc.network`, `docs.ohc.network`, `ohcnf.com`, `ohc.network`
  (their whole domain family) — blocked by this session's network
  egress policy.
- GitHub's own image CDNs, where PR screenshots actually live
  (`user-images.githubusercontent.com`,
  `private-user-images.githubusercontent.com`) — blocked.
- Confirmed this isn't CARE-specific by testing `linear.app` and
  `en.wikipedia.org` directly — both also blocked.
- The Playwright MCP browser tool is separately broken in this
  environment: Chromium won't launch as root without a `--no-sandbox`
  flag the MCP server's current config doesn't pass, and MCP server
  config can't hot-reload mid-session to pick up a fix.

So this environment has a narrow domain allowlist (GitHub's own HTML
pages and API worked; general web browsing and image CDNs did not) and
no working browser/screenshot tool. There is no viable path to
live-browse any reference product — CARE or otherwise — from here. This
is an environment constraint, not something fixable by trying a
different target site or search query, which is why it needed a
recorded decision rather than another attempt.

## Decision

Stop trying to reference CARE's live product entirely. Build the
console's visual/interaction quality directly from documented, real
knowledge of Linear, Notion, and Stripe's actual products — their
well-established, widely-documented conventions (density/spacing
rhythm, calm recessed-panel treatments, real typographic hierarchy,
deliberate whitespace) — the same three products
`docs/design/principles.md` #9 and
`docs/research/design-system-standards.md` already name as the actual
bar, rather than continuing to treat CARE as a stand-in for them.

This refines ADR 0010, it doesn't reverse it: ADR 0010's "don't pull
CARE source verbatim" half still stands. What changes is the
*composition/polish reference* — CARE drops out of that role entirely,
since we can't actually see its real product and its code alone
doesn't encode design judgment. ADR 0008's token/color decision (CARE's
exact emerald/neutral palette) is unaffected — colors stay as they are;
this is about screen composition and polish, not the color system.

First application: the bot editor's `Card` component was retuned this
session — a soft-tinted background (`bg-soft-background`) as a calm
recessed panel instead of a plain white box with only a border, white
`Input`/`Textarea` fields popping inside it, a bigger `CardTitle` for
real section-level hierarchy, more generous padding — drawn from real,
documented Notion/Stripe conventions (soft panels, deliberate
whitespace, real typographic hierarchy), not from anything CARE's code
showed us.

## Alternatives considered

- **Keep trying other fetch strategies/domains for CARE reference** —
  rejected: we tested broadly enough (CARE's whole domain family, an
  unrelated well-known site, a completely different tool) to conclude
  this is a systemic environment restriction, not a fixable one-off.
- **Ask the user to keep manually pasting screenshots for every future
  screen** — not rejected outright, still available as a supplementary
  option per-screen when pixel-exact matching to something specific is
  wanted, but not the default path since it doesn't scale to
  redesigning every remaining screen.
- **Keep referencing CARE's code as before (status quo)** — rejected
  per the user's original complaint: this doesn't actually produce
  Linear/Notion/Stripe-caliber results, because code alone doesn't
  encode the design judgment that makes those products feel the way
  they do.

## Consequences

- Easy to reverse: this is a working-practice/reference-source choice,
  not a data model or infrastructure commitment. If network access to
  CARE's product is ever unblocked, or the user shares more
  screenshots, either can resume as a reference source alongside this.
- `docs/conventions.md`'s "Building a new feature" step 2 should stop
  pointing at "check CARE" for visual reference and point at documented
  Linear/Notion/Stripe conventions and
  `docs/research/design-system-standards.md` instead — updated in this
  same change.
- ADR 0008 (tokens/colors) and the "don't pull CARE source verbatim"
  half of ADR 0010 both remain accepted and unaffected.
