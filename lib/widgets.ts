import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { WIDGET_FIELD_TYPES, type WidgetField, type WidgetFieldType } from "@/lib/widgetOptions";

export { WIDGET_FIELD_TYPES, type WidgetField, type WidgetFieldType };

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
  }));
}

export interface CreateWidgetInput {
  name: string;
  triggerDescription: string;
  submitLabel: string;
  fields: WidgetField[];
}

export async function createWidget(orgId: string, botId: string, input: CreateWidgetInput): Promise<void> {
  await withOrgContext(orgId, (tx) =>
    tx.widget.create({
      data: {
        orgId,
        botId,
        name: input.name,
        triggerDescription: input.triggerDescription,
        submitLabel: input.submitLabel || "Submit",
        schema: fieldsToSchema(input.fields) as unknown as Prisma.InputJsonValue,
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
// listEnabledCustomActionsForExecution.
export interface WidgetForExecution {
  id: string;
  name: string;
  triggerDescription: string;
  submitLabel: string;
  schema: unknown;
}

export async function listEnabledWidgetsForExecution(orgId: string, botId: string): Promise<WidgetForExecution[]> {
  const rows = await withOrgContext(orgId, (tx) => tx.widget.findMany({ where: { botId, enabled: true } }));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    triggerDescription: row.triggerDescription,
    submitLabel: row.submitLabel,
    schema: row.schema,
  }));
}
