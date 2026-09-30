import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  WIDGET_FIELD_TYPES,
  WIDGET_HTTP_METHODS,
  type WidgetField,
  type WidgetFieldType,
  type WidgetHttpMethod,
} from "@/lib/widgetOptions";

export { WIDGET_FIELD_TYPES, WIDGET_HTTP_METHODS, type WidgetField, type WidgetFieldType, type WidgetHttpMethod };

// Data layer for in-chat interactive widgets (ADR 0028) — the console
// CRUD side of lib/ai/tools/widget.ts's runtime tool factory. Same
// precedent as lib/customActions.ts (ADR 0022): generic across every
// vertical (guardrail #2), takes effect immediately on save/toggle, not
// gated behind the bot's draft/publish cycle.

export interface WidgetRow {
  id: string;
  name: string;
  triggerDescription: string;
  submitLabel: string;
  fields: WidgetField[];
  enabled: boolean;
  createdAt: Date;
  // Phase 2 (ADR 0028) — null/undefined apiUrl means collection-only,
  // Phase 1's original behavior.
  apiUrl: string | null;
  apiMethod: WidgetHttpMethod | null;
  hasHeaders: boolean;
  writeCapable: boolean;
}

interface JsonSchemaProperty {
  type: "string" | "number" | "boolean";
  title: string;
  enum?: string[];
}

interface JsonSchemaShape {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  additionalProperties: false;
}

// JSON Schema (ADR 0028's confirmed format, 2026-09-29) — an actual
// standard, not a custom shape, and the same format lib/ai/tools/
// registry.ts's Tool.inputSchema and lib/customActions.ts's
// CustomAction.inputSchema already use.
function fieldToSchemaType(type: WidgetFieldType): "string" | "number" | "boolean" {
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  return "string"; // "text" and "select" are both string-typed
}

function fieldsToSchema(fields: WidgetField[]): JsonSchemaShape {
  const properties: JsonSchemaShape["properties"] = {};
  const required: string[] = [];
  for (const field of fields) {
    if (!field.name) continue;
    const property: JsonSchemaProperty = { type: fieldToSchemaType(field.type), title: field.label || field.name };
    if (field.type === "select" && field.options.length > 0) property.enum = field.options;
    properties[field.name] = property;
    if (field.required) required.push(field.name);
  }
  return { type: "object", properties, required, additionalProperties: false };
}

function schemaToFields(schema: unknown): WidgetField[] {
  const shape = schema as Partial<JsonSchemaShape> | null;
  if (!shape?.properties) return [];
  const required = new Set(shape.required ?? []);
  return Object.entries(shape.properties).map(([name, def]) => {
    const type: WidgetFieldType = def.enum ? "select" : def.type === "number" ? "number" : def.type === "boolean" ? "boolean" : "text";
    return {
      name,
      label: def.title ?? name,
      type,
      required: required.has(name),
      options: def.enum ?? [],
    };
  });
}

// Slug a business-typed widget name into the tool identifier Claude and
// the chat-loop merge logic key off — lowercase, underscores,
// alphanumeric only, matching slugifyActionName's exact rules (ADR 0022).
export function slugifyWidgetName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export async function listWidgets(orgId: string, botId: string): Promise<WidgetRow[]> {
  const rows = await withOrgContext(orgId, (tx) => tx.widget.findMany({ where: { botId }, orderBy: { createdAt: "desc" } }));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    triggerDescription: row.triggerDescription,
    submitLabel: row.submitLabel,
    fields: schemaToFields(row.schema),
    enabled: row.enabled,
    createdAt: row.createdAt,
    apiUrl: row.apiUrl,
    apiMethod: row.apiMethod as WidgetHttpMethod | null,
    hasHeaders: row.headersEncrypted !== null,
    writeCapable: row.writeCapable,
  }));
}

export interface CreateWidgetInput {
  name: string;
  triggerDescription: string;
  submitLabel: string;
  fields: WidgetField[];
  // Phase 2 (ADR 0028) — omit entirely for a collection-only widget.
  api?: {
    method: WidgetHttpMethod;
    url: string;
    headers?: Record<string, string>;
    writeCapable: boolean;
  };
}

export async function createWidget(orgId: string, botId: string, input: CreateWidgetInput): Promise<void> {
  const headersEncrypted =
    input.api?.headers && Object.keys(input.api.headers).length > 0 ? encrypt(JSON.stringify(input.api.headers)) : null;

  await withOrgContext(orgId, (tx) =>
    tx.widget.create({
      data: {
        orgId,
        botId,
        name: input.name,
        triggerDescription: input.triggerDescription,
        submitLabel: input.submitLabel || "Submit",
        schema: fieldsToSchema(input.fields) as unknown as Prisma.InputJsonValue,
        apiUrl: input.api?.url ?? null,
        apiMethod: input.api?.method ?? null,
        headersEncrypted,
        writeCapable: input.api?.writeCapable ?? false,
      },
    }),
  );
}

export async function setWidgetEnabled(orgId: string, botId: string, id: string, enabled: boolean): Promise<void> {
  await withOrgContext(orgId, (tx) => tx.widget.update({ where: { id, botId }, data: { enabled } }));
}

export async function deleteWidget(orgId: string, botId: string, id: string): Promise<void> {
  await withOrgContext(orgId, (tx) => tx.widget.delete({ where: { id, botId } }));
}

// Read path for lib/ai/tools/widget.ts — the runtime tool factory only
// needs enabled widgets, same precedent as
// listEnabledCustomActionsForExecution. Headers come back decrypted
// here (never in WidgetRow above, which faces the console UI) — same
// separation CustomActionForExecution already established.
export interface WidgetForExecution {
  id: string;
  name: string;
  triggerDescription: string;
  submitLabel: string;
  schema: unknown;
  apiUrl: string | null;
  apiMethod: WidgetHttpMethod | null;
  headers: Record<string, string>;
  writeCapable: boolean;
}

function toWidgetForExecution(row: {
  id: string;
  name: string;
  triggerDescription: string;
  submitLabel: string;
  schema: unknown;
  apiUrl: string | null;
  apiMethod: string | null;
  headersEncrypted: string | null;
  writeCapable: boolean;
}): WidgetForExecution {
  return {
    id: row.id,
    name: row.name,
    triggerDescription: row.triggerDescription,
    submitLabel: row.submitLabel,
    schema: row.schema,
    apiUrl: row.apiUrl,
    apiMethod: row.apiMethod as WidgetHttpMethod | null,
    headers: row.headersEncrypted ? (JSON.parse(decrypt(row.headersEncrypted)) as Record<string, string>) : {},
    writeCapable: row.writeCapable,
  };
}

export async function listEnabledWidgetsForExecution(orgId: string, botId: string): Promise<WidgetForExecution[]> {
  const rows = await withOrgContext(orgId, (tx) => tx.widget.findMany({ where: { botId, enabled: true } }));
  return rows.map(toWidgetForExecution);
}

// For the approvals console action (app/(console)/bots/[botId]/
// approvals/actions.ts) to resolve a write-capable widget's real API
// config at approval time — a PendingAction only stores the toolName
// (`submit_widget_<name>`) and the visitor's input, not the widget's
// own URL/headers, so this is how the executor finds them.
export async function getWidgetByNameForExecution(
  orgId: string,
  botId: string,
  name: string,
): Promise<WidgetForExecution | null> {
  const row = await withOrgContext(orgId, (tx) => tx.widget.findUnique({ where: { botId_name: { botId, name } } }));
  return row ? toWidgetForExecution(row) : null;
}
