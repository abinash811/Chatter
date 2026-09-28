import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";

// Generic queue for write-capable tools awaiting human approval (ADR
// 0023) — deliberately has zero knowledge of any specific tool. Which
// function actually executes a given toolName lives with the console
// action that calls resolvePendingAction (app/(console)/bots/[botId]/
// approvals/actions.ts), not here — importing a specific tool's executor
// into this file would create a cycle (that tool's own handle() already
// imports createPendingAction from here).

export type PendingActionStatus = "pending" | "approved" | "rejected" | "failed";

export interface PendingActionRow {
  id: string;
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

export async function listPendingActions(orgId: string, botId: string): Promise<PendingActionRow[]> {
  const rows = await withOrgContext(orgId, (tx) =>
    tx.pendingAction.findMany({ where: { botId }, orderBy: { createdAt: "desc" } }),
  );
  return rows.map((row) => ({
    id: row.id,
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
  botId: string,
  id: string,
): Promise<{ toolName: string; input: Record<string, unknown> }> {
  const row = await withOrgContext(orgId, (tx) => tx.pendingAction.findUniqueOrThrow({ where: { id, botId } }));
  return { toolName: row.toolName, input: row.input as Record<string, unknown> };
}

export async function resolvePendingAction(
  orgId: string,
  botId: string,
  id: string,
  status: PendingActionStatus,
  result: string | null,
): Promise<void> {
  await withOrgContext(orgId, (tx) =>
    tx.pendingAction.update({ where: { id, botId }, data: { status, result, resolvedAt: new Date() } }),
  );
}
