# Research note: How Chatbase actually does persona/use-case templates

Date: 2026-09-27
Researcher: Claude (web search — direct fetch to chatbase.co is blocked by
this environment's egress proxy, so findings are triangulated across 3
WebSearch queries hitting Chatbase's own docs/blog/changelog pages via
search-result summaries, not a raw page fetch)
Status: enough to inform the `docs/open-questions.md` #4 decision; a
first-hand dashboard walkthrough is still TODO if we want to verify beyond
what their public docs/blog describe.

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

## TODO — still need to research

- A first-hand look at the real Chatbase dashboard (screenshots or a live
  account) to confirm the above beyond what their own docs/blog claim —
  egress to chatbase.co is blocked in this environment, so this needs
  either a different research pass or a manual check by the user.
- How Intercom Fin and Crisp handle the same question (not checked this
  pass) — would strengthen or weaken the "decoupled is the norm" finding
  if more than one competitor is checked.

## Sources

- https://www.chatbase.co/docs/user-guides/quick-start/your-first-agent
- https://www.chatbase.co/changelog/introducing-ai-actions
- https://www.chatbase.co/blog/ai-agents-that-take-action
- https://www.chatbase.co/use-cases/sales-agent
