import { type Page, expect } from "@playwright/test";
import type { Prisma } from "@prisma/client";
import { withOrgContext, getOrgIdForBot } from "@/lib/db";

// Shared across every e2e spec that needs a signed-up, onboarded user
// with a first bot — extracted here (ADR 0012's onboarding change is
// what motivated it) so a future flow change touches one file, not six.

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export const PASSWORD = "hunter2pass";

// Signs up, completes onboarding (org name left at its prefilled
// default — most specs don't care), and lands on the new bot's editor.
export async function signUpAndCreateBot(page: Page, botName: string, emailPrefix = "e2e"): Promise<void> {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail(emailPrefix));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.fill("#botName", botName);
  await page.click('button:has-text("Continue")');
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
}

// Creates an additional bot from the /bots list once onboarding is
// already done — the dialog-based flow (NewBotDialog.tsx, 2026-09-27,
// docs/design/audit.md's "Bots list — open findings") replacing the old
// inline name-input + button. Extracted here after that change broke
// three different specs' own copies of this same sequence.
export async function createSecondBot(page: Page, name: string): Promise<void> {
  await page.goto("/bots");
  await page.getByRole("button", { name: "New bot", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill(name);
  await Promise.all([
    page.waitForURL(/\/bots\/[^/]+$/),
    page.getByRole("button", { name: "Create", exact: true }).click(),
  ]);
}

// ADR 0015: conversations are only ever created via the widget chat API
// (app/api/chat/route.ts), which requires a real ANTHROPIC_API_KEY —
// same placeholder-key gap documented for the knowledge base's
// embeddings call (tests/e2e/knowledge.spec.ts). Seeding directly via
// Prisma, scoped through the same RLS mechanism the app itself uses
// (withOrgContext from lib/db.ts — never a second PrismaClient here,
// see check-tenant-isolation.mjs), stands in for a real chat turn —
// same pattern as knowledge.spec.ts's directly-seeded entry.
// getOrgIdForBot (lib/db.ts) is how this resolves a bot's orgId before
// app.org_id can be set, the same bootstrapping problem the app itself
// solves via BotPublicKey, the one table exempt from RLS.
export async function seedConversations(
  botId: string,
): Promise<{ normalConversationId: string; issueConversationId: string; pausedConversationId: string }> {
  const orgId = await getOrgIdForBot(botId);
  const draft = await withOrgContext(orgId, (tx) => tx.botConfigVersion.findFirstOrThrow({ where: { botId } }));

  const normal = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId: draft.id } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.createMany({
      data: [
        { orgId, conversationId: normal.id, role: "user", content: "Do you sell blue widgets?" },
        { orgId, conversationId: normal.id, role: "assistant", content: "Yes, in stock at $19.99." },
      ],
    }),
  );

  const withIssue = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId: draft.id } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.createMany({
      data: [
        { orgId, conversationId: withIssue.id, role: "user", content: "Where is my order #ORD1234?" },
        {
          orgId,
          conversationId: withIssue.id,
          role: "assistant",
          content: "I've noted your order number and will connect you with a human.",
        },
      ],
    }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.toolCallLog.create({
      data: {
        orgId,
        conversationId: withIssue.id,
        toolName: "check_order_status",
        input: { orderNumber: "ORD1234" },
        output: JSON.stringify({
          status: "handoff_required",
          reason: "No Shopify store connected for this bot yet.",
          collected: { orderNumber: "ORD1234" },
        }),
      },
    }),
  );

  // ADR 0027 — a paused conversation for pause/resume + status-filter
  // coverage.
  const paused = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId: draft.id, status: "paused" } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.create({
      data: { orgId, conversationId: paused.id, role: "user", content: "Is anyone still there?" },
    }),
  );

  return { normalConversationId: normal.id, issueConversationId: withIssue.id, pausedConversationId: paused.id };
}

// Same class of gap as seedConversations: a real Q&A entry needs a
// working embeddings call (VOYAGE_API_KEY is a placeholder here), so
// this seeds a KnowledgeSource+KnowledgeChunk directly — a zero vector
// stands in for a real embedding, matching lib/ai/knowledgeBase.ts's
// own createQaEntry shape (chunk created via Prisma, embedding column
// set via a separate $executeRaw since pgvector isn't in schema.prisma).
export async function seedKnowledgeEntry(
  botId: string,
  question: string,
  answer: string,
  kind: string = "qa",
): Promise<void> {
  const orgId = await getOrgIdForBot(botId);
  const zeroVector = `[${Array(1536).fill(0).join(",")}]`;

  await withOrgContext(orgId, async (tx) => {
    const source = await tx.knowledgeSource.create({ data: { orgId, botId, kind, title: question } });
    const chunk = await tx.knowledgeChunk.create({ data: { orgId, sourceId: source.id, content: answer } });
    await tx.$executeRaw`update knowledge_chunks set embedding = ${zeroVector}::vector where id = ${chunk.id}`;
  });
}

// collect_lead (lib/ai/tools/collectLead.ts) is only ever called by the
// bot mid-conversation, which needs a real ANTHROPIC_API_KEY — same
// placeholder-key gap as seedConversations/seedKnowledgeEntry above.
// Seeds a Lead row directly through the same withOrgContext path the
// tool itself uses.
export async function seedLead(
  botId: string,
  fields: { name?: string; email?: string; phone?: string; note?: string },
): Promise<void> {
  const orgId = await getOrgIdForBot(botId);
  await withOrgContext(orgId, (tx) => tx.lead.create({ data: { orgId, botId, ...fields } }));
}

// Custom action (ADR 0022) rows for a11y/visual specs that just need a
// populated list, not the console's Add dialog round trip — same
// bypass-the-UI precedent as seedLead above.
export async function seedCustomAction(
  botId: string,
  fields: { name: string; description: string; method?: string; url?: string },
): Promise<void> {
  const orgId = await getOrgIdForBot(botId);
  await withOrgContext(orgId, (tx) =>
    tx.customAction.create({
      data: {
        orgId,
        botId,
        name: fields.name,
        description: fields.description,
        method: fields.method ?? "POST",
        url: fields.url ?? "https://api.example.com/hook",
        inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
    }),
  );
}

// Widget (ADR 0028) rows for a11y/e2e specs that just need a populated
// list, not the console's Add dialog round trip — same bypass-the-UI
// precedent as seedCustomAction above.
export async function seedWidget(
  botId: string,
  fields: {
    name: string;
    triggerDescription: string;
    schema?: Record<string, unknown>;
    // Phase 2 (ADR 0028) — omit for a collection-only widget.
    apiUrl?: string;
    apiMethod?: string;
    writeCapable?: boolean;
  },
): Promise<void> {
  const orgId = await getOrgIdForBot(botId);
  await withOrgContext(orgId, (tx) =>
    tx.widget.create({
      data: {
        orgId,
        botId,
        name: fields.name,
        triggerDescription: fields.triggerDescription,
        submitLabel: "Submit",
        schema: (fields.schema ?? {
          type: "object",
          properties: { name: { type: "string", title: "Name" } },
          required: ["name"],
          additionalProperties: false,
        }) as Prisma.InputJsonValue,
        apiUrl: fields.apiUrl ?? null,
        apiMethod: fields.apiMethod ?? null,
        writeCapable: fields.writeCapable ?? false,
      },
    }),
  );
}

// Real keyboard-only pass, made permanent and automated instead of a
// one-off MCP browser session (that's how Sidebar's 2026-10-03 pass was
// done — docs/design/audit.md's own note says "a Playwright tab-walk,"
// but nothing committed it as a repeatable check). Tabs forward through
// a page starting from whatever already has focus on load (including a
// real `autoFocus` field, same as what a real keyboard user sees), and
// for each stop records whether the browser is actually painting a
// visible focus indicator (outline or box-shadow) — the same thing a
// human doing a real keyboard-only pass would look for, not just that
// *a* DOM element received focus. Stops early if Tab stops moving focus
// (reached the end of the document) so callers don't need to know a
// page's exact control count up front.
//
// Deliberately does NOT blur() the active element before starting: an
// earlier version did, to "reset" to a known starting point, but
// Chromium doesn't restart sequential tab order from the top of the
// document after a programmatic blur — it resumes from the blurred
// element's own position, silently skipping over any real `autoFocus`
// field (confirmed via a real debug walk on /onboarding, whose
// `orgName` input has `autoFocus`: blur-then-Tab landed on `botName`
// first, never `orgName`, even though a real keyboard user loading that
// page lands on `orgName` immediately). Starting from the page's real
// initial focus state avoids the quirk entirely and is the more
// accurate thing to test anyway.
export async function keyboardWalk(
  page: Page,
  maxSteps: number,
): Promise<Array<{ tag: string; role: string | null; name: string; hasFocusIndicator: boolean }>> {
  const results: Array<{ tag: string; role: string | null; name: string; hasFocusIndicator: boolean }> = [];
  let previous: string | null = null;

  const inspect = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const hasOutline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const hasShadow = style.boxShadow !== "none" && style.boxShadow.trim() !== "";
      // A real per-node fingerprint, not a text/id heuristic — an
      // earlier version of this helper used `aria-label ?? id ??
      // textContent`, which silently collided on every unlabeled
      // element: a DOM node's `id` is `""` (not `null`) when unset, so
      // `??` never fell through to textContent, and two different
      // unlabeled sidebar links both fingerprinted as "A:" — the walk
      // then mistook real tab progress for a stall and stopped after
      // one step on every screen. Tagging the actual DOM node instead
      // can't collide.
      const marked = el as HTMLElement & { dataset: { kbdWalkId?: string } };
      if (!marked.dataset.kbdWalkId) {
        const w = window as unknown as { __kbdWalkCounter?: number };
        w.__kbdWalkCounter = (w.__kbdWalkCounter ?? 0) + 1;
        marked.dataset.kbdWalkId = String(w.__kbdWalkCounter);
      }
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60),
        hasFocusIndicator: hasOutline || hasShadow,
        fingerprint: marked.dataset.kbdWalkId,
      };
    });

  // Capture whatever already has focus (e.g. a real `autoFocus` field)
  // before pressing Tab even once — that's the page's real starting
  // state for a keyboard user, not something to discard.
  const initial = await inspect();
  if (initial) {
    results.push(initial);
    previous = initial.fingerprint;
  }

  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press("Tab");
    const info = await inspect();
    if (!info) break;
    if (info.fingerprint === previous) break;
    previous = info.fingerprint;
    results.push(info);
  }
  return results;
}

// A write-capable tool's (request_order_cancellation, ADR 0023) queued
// request — bypasses calling the real tool, same precedent as seedLead,
// since there's no live Shopify integration connectable in this
// environment either.
export async function seedPendingAction(
  botId: string,
  fields: { toolName: string; input: Record<string, unknown>; conversationId?: string },
): Promise<void> {
  const orgId = await getOrgIdForBot(botId);
  await withOrgContext(orgId, (tx) =>
    tx.pendingAction.create({
      data: {
        orgId,
        botId,
        conversationId: fields.conversationId ?? "conv-seed-1",
        toolName: fields.toolName,
        input: fields.input as Prisma.InputJsonValue,
      },
    }),
  );
}
