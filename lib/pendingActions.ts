import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";

// Generic queue for write-capable tools awaiting human approval (ADR
// 0023) — deliberately has zero knowledge of any specific tool. Which
// function actually executes a given toolName lives with the console
// action that calls resolvePendingAction (app/(console)/approvals/
// actions.ts), not here — importing a specific tool's executor into
// this file would create a cycle (that tool's own handle() already
// imports createPendingAction from here).
//
// ADR 0038 (2026-10-04): the console page is org-wide now, not
// bot-scoped — listPendingActions takes an optional botId filter
// instead of a required one, and getPendingActionForExecution/
// resolvePendingAction no longer take botId at all (orgId via
// withOrgContext's RLS scoping + the row's own unique id is enough;
// botId is still stored on the row and returned where a caller needs
// it, e.g. executeWidgetSubmission's widget lookup).

export type PendingActionStatus = "pending" | "approved" | "rejected" | "failed";

export interface PendingActionRow {
  id: string;
  botId: string;
  botName: string;
  conversationId: string;
  toolName: string;
  input: Record<string, unknown>;
  status: PendingActionStatus;
  result: string | null;
  createdAt: Date;
}

export async function createPendingAction(
  orgId: string,
  botId: string,
  conversationId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<void> {
  await withOrgContext(orgId, (tx) =>
    tx.pendingAction.create({
      data: { orgId, botId, conversationId, toolName, input: input as Prisma.InputJsonValue },
    }),
  );
}

export async function listPendingActions(orgId: string, botId?: string): Promise<PendingActionRow[]> {
  const rows = await withOrgContext(orgId, (tx) =>
    tx.pendingAction.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
      include: { bot: { select: { name: true } } },
    }),
  );
  return rows.map((row) => ({
    id: row.id,
    botId: row.botId,
    botName: row.bot.name,
    conversationId: row.conversationId,
    toolName: row.toolName,
    input: row.input as Record<string, unknown>,
    status: row.status,
    result: row.result,
    createdAt: row.createdAt,
  }));
}

export async function getPendingActionForExecution(
  orgId: string,
  id: string,
): Promise<{ botId: string; toolName: string; input: Record<string, unknown> }> {
  const row = await withOrgContext(orgId, (tx) => tx.pendingAction.findUniqueOrThrow({ where: { id } }));
  return { botId: row.botId, toolName: row.toolName, input: row.input as Record<string, unknown> };
}

export async function resolvePendingAction(
  orgId: string,
  id: string,
  status: PendingActionStatus,
  result: string | null,
): Promise<void> {
  await withOrgContext(orgId, (tx) =>
    tx.pendingAction.update({ where: { id }, data: { status, result, resolvedAt: new Date() } }),
  );
}
