# Research note: How Chatbase actually does persona/use-case templates

Date: 2026-09-27, live-verified 2026-09-28
Researcher: Claude (originally web search — direct fetch to chatbase.co
was blocked by this environment's egress proxy at the time, so the
2026-09-27 findings below were triangulated across 3 WebSearch queries
hitting Chatbase's own docs/blog/changelog pages via search-result
summaries, not a raw page fetch. **2026-09-28: `chatbase.co` access
confirmed working** — WebFetch successfully read the homepage and
several docs pages directly. Re-fetched `your-first-agent` and
`introducing-ai-actions` live to check the finding below; see "Live
re-check" section.)
Status: the core "persona and tools are decoupled" finding holds up
under a live re-check, though the specific "dropdown of example
instruction text" UI detail wasn't re-confirmed (the live docs page
describes Instructions as free-text tone/role/boundary guidance, not a
template picker) — that detail may have come from a different page or
changed since. A first-hand dashboard walkthrough (screenshots or a
live account) is still the way to fully verify beyond what the public
docs describe.

## Why this research

`docs/open-questions.md` #4 (prompt/persona template scope) needed a real
answer to "how does the closest competitor actually do this," not a guess,
per CLAUDE.md's "check current practice, don't recall it." The initial
framing in this session assumed a template might bundle persona text
*together with* a specific tool/action set (e.g. "appointment booking" =
persona + book/cancel/reschedule tools as one atomic thing) — worth
checking against a real product before committing to that shape.

## Finding: Chatbase deliberately keeps persona and tools decoupled

Chatbase's agent-creation flow (per their quick-start docs and product
pages) is:

1. **Upload training data** (documents, FAQs, site links).
2. **Persona & Instructions step** — a plain textarea for behavior/tone/
   approach, with **a dropdown of example instruction text for different
   business types and scenarios** that you copy and customize. This is
   the entire "template" mechanism: canned *text*, nothing more. Picking
   one doesn't touch anything else in the setup.
3. **Actions tab** — a fully separate, independent step where you toggle
   individual prebuilt tools (Calendly, Cal.com, Slack, Web Search,
   Collect Leads, Custom Button) or wire a custom API action. Enabling
   "Calendly booking" here has no relationship to what's in the Persona
   step — a business writes appointment-booking instructions into the
   persona text *and separately* remembers to turn on the Calendly action.
4. **Deploy.**

So there is no "use-case template" as a single bundled object in Chatbase's
real product — persona template and tool selection are two orthogonal,
independently-configured concerns. The "use cases" on their marketing site
(sales agent, support agent, booking) are landing-page framing over this
same generic mechanism, not a distinct configuration object in the product.

## Implication for us

This directly informs `docs/open-questions.md` #4: the competitor closest
to our product does **not** validate a persona+tools bundled template — it
validates the opposite (keep them decoupled, exactly matching what we
already have: Tools tab and Persona tab are already separate today).

That's a real data point, but not necessarily the right call for us to
copy blindly. A genuine product opinion, not a foregone conclusion: our own
tool registry today is small and clearly use-case-differentiated
(`search_knowledge_base` vs `check_order_status`), and the roadmap's
self-serve bar ("a dumb person should be able to land on this, configure,
and use it," `docs/roadmap.md`) argues for reducing the number of separate
decisions a new business has to remember to make. A bundled template
(persona text + a *suggested* tool subset, still editable after picking)
could plausibly beat Chatbase's fully decoupled model for *our* bar
specifically, at the cost of being one more thing to maintain/decide when
adding a template later. Chatbase's approach is the safer default (simpler,
proven, matches a much bigger product's real UX); a bundle is the more
ambitious bet. This is the user's call to make with this tradeoff stated
plainly, not something to decide by copying the competitor unexamined.

## Live re-check (2026-09-28)

With `chatbase.co` access confirmed working, re-fetched two of the
sources below directly instead of relying on search-result summaries:

- **`your-first-agent`**: describes a 3-step flow — Create & Train
  (pick a data source), Test & Optimize (`Build > Instructions`: model
  selection, free-text instructions for tone/role/boundaries,
  temperature), then Deploy (Channels, embed script). Confirms
  Instructions and Actions are not the same step, and Actions are
  surfaced only in a "next steps" section after deployment, not bundled
  into agent creation — consistent with the original finding. Does
  *not* mention a template/dropdown of canned instruction text for the
  Instructions step, which the 2026-09-27 WebSearch-triangulated
  summary below claimed.
- **`introducing-ai-actions`**: confirms Actions are configured
  independently — "set up your API or select from prebuilt actions,"
  then "provide a prompt to guide the Agent on when and how to use the
  action" (its own prompt field, separate from the main Instructions
  text) — consistent with "orthogonal, independently-configured
  concerns."

Net: the decoupled-steps conclusion stands, now on a firmer footing
(live primary source, not a search summary). The one specific claim
this doesn't confirm is the "dropdown of example instruction text"
detail — flag that specific line as unconfirmed, not retracted.

## TODO — still need to research

- A first-hand look at the real Chatbase dashboard UI itself
  (screenshots or a live account), not just its public docs — `WebFetch`
  reads rendered docs/marketing pages, not an authenticated dashboard,
  so the actual Instructions-step UI (is there a template dropdown or
  not?) still needs either a live account or user-supplied screenshots.
- How Intercom Fin and Crisp handle the same question (not checked this
  pass) — would strengthen or weaken the "decoupled is the norm" finding
  if more than one competitor is checked.

## Sources

- https://www.chatbase.co/docs/user-guides/quick-start/your-first-agent
- https://www.chatbase.co/changelog/introducing-ai-actions
- https://www.chatbase.co/blog/ai-agents-that-take-action
- https://www.chatbase.co/use-cases/sales-agent
