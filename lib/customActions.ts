import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { HTTP_METHODS, type HttpMethod, type ActionField } from "@/lib/customActionOptions";

// Data layer for business-defined webhook actions (ADR 0022) — the
// console CRUD side of lib/ai/tools/customAction.ts's runtime tool
// factory. Generic across every vertical (guardrail #2): any business can
// wire up their own endpoint (booking system, CRM, inventory API, ...),
// not just ecommerce.

export { HTTP_METHODS, type HttpMethod, type ActionField };

export interface CustomActionRow {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  hasHeaders: boolean;
  fields: ActionField[];
  enabled: boolean;
  createdAt: Date;
}

interface JsonSchemaShape {
  type: "object";
  properties: Record<string, { type: "string"; description: string }>;
  required: string[];
  additionalProperties: false;
}

function fieldsToSchema(fields: ActionField[]): JsonSchemaShape {
  const properties: JsonSchemaShape["properties"] = {};
  const required: string[] = [];
  for (const field of fields) {
    if (!field.name) continue;
    properties[field.name] = { type: "string", description: field.description };
    if (field.required) required.push(field.name);
  }
  return { type: "object", properties, required, additionalProperties: false };
}

function schemaToFields(schema: unknown): ActionField[] {
  const shape = schema as Partial<JsonSchemaShape> | null;
  if (!shape?.properties) return [];
  const required = new Set(shape.required ?? []);
  return Object.entries(shape.properties).map(([name, def]) => ({
    name,
    description: (def as { description?: string }).description ?? "",
    required: required.has(name),
  }));
}

// Slug a business-typed action name into the tool identifier Claude and
// the registry merge logic key off (ADR 0022) — lowercase, underscores,
// alphanumeric only, since tool names are matched literally against the
// model's tool_use calls.
export function slugifyActionName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export async function listCustomActions(orgId: string, botId: string): Promise<CustomActionRow[]> {
  const rows = await withOrgContext(orgId, (tx) =>
    tx.customAction.findMany({ where: { botId }, orderBy: { createdAt: "desc" } }),
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    method: row.method as HttpMethod,
    url: row.url,
    hasHeaders: row.headersEncrypted !== null,
    fields: schemaToFields(row.inputSchema),
    enabled: row.enabled,
    createdAt: row.createdAt,
  }));
}

export interface CreateCustomActionInput {
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  fields: ActionField[];
}

export async function createCustomAction(orgId: string, botId: string, input: CreateCustomActionInput): Promise<void> {
  const headersEncrypted =
    input.headers && Object.keys(input.headers).length > 0 ? encrypt(JSON.stringify(input.headers)) : null;

  await withOrgContext(orgId, (tx) =>
    tx.customAction.create({
      data: {
        orgId,
        botId,
        name: input.name,
        description: input.description,
        method: input.method,
        url: input.url,
        headersEncrypted,
        inputSchema: fieldsToSchema(input.fields) as unknown as Prisma.InputJsonValue,
      },
    }),
  );
}

export async function setCustomActionEnabled(orgId: string, botId: string, id: string, enabled: boolean): Promise<void> {
  await withOrgContext(orgId, (tx) => tx.customAction.update({ where: { id, botId }, data: { enabled } }));
}

export async function deleteCustomAction(orgId: string, botId: string, id: string): Promise<void> {
  await withOrgContext(orgId, (tx) => tx.customAction.delete({ where: { id, botId } }));
}

// Read path for lib/ai/tools/customAction.ts — needs the decrypted
// headers to actually call the webhook, so this stays separate from the
// console-facing listCustomActions() above (which never exposes header
// values, encrypted or not, back to the browser).
export interface CustomActionForExecution {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  inputSchema: unknown;
}

export async function listEnabledCustomActionsForExecution(
  orgId: string,
  botId: string,
): Promise<CustomActionForExecution[]> {
  const rows = await withOrgContext(orgId, (tx) =>
    tx.customAction.findMany({ where: { botId, enabled: true } }),
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    method: row.method as HttpMethod,
    url: row.url,
    headers: row.headersEncrypted ? (JSON.parse(decrypt(row.headersEncrypted)) as Record<string, string>) : {},
    inputSchema: row.inputSchema,
  }));
}
