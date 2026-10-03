"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import {
  createWidget,
  setWidgetEnabled,
  deleteWidget,
  slugifyWidgetName,
  WIDGET_FIELD_TYPES,
  WIDGET_HTTP_METHODS,
  type WidgetField,
  type WidgetFieldType,
  type WidgetHttpMethod,
} from "@/lib/widgets";
import { isBlockedActionUrl } from "@/lib/ai/tools/customAction";

export interface WidgetState {
  status: "idle" | "success" | "error";
  message: string | null;
}

function isWidgetFieldType(value: string): value is WidgetFieldType {
  return (WIDGET_FIELD_TYPES as readonly string[]).includes(value);
}

function isWidgetHttpMethod(value: string): value is WidgetHttpMethod {
  return (WIDGET_HTTP_METHODS as readonly string[]).includes(value);
}

// Same parsing as actions.ts's own readHeaders — duplicated rather than
// shared, matching this codebase's existing precedent (cancelOrder.ts's
// Shopify lookup) of not refactoring two independently-tested call
// sites into one shared helper for a few lines of pure parsing.
function readApiHeaders(raw: string): Record<string, string> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const headers: Record<string, string> = {};
  for (const line of trimmed.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) headers[key] = value;
  }
  return headers;
}

// Up to 4 fields per widget — same fixed-rows precedent as actions.ts's
// MAX_FIELDS (CLAUDE.md's "dumb person should be able to configure
// this" bar, no dynamic add/remove array to wire up). A blank name
// means that row isn't used.
const MAX_FIELDS = 4;

function readFields(formData: FormData): WidgetField[] {
  const fields: WidgetField[] = [];
  for (let i = 0; i < MAX_FIELDS; i++) {
    const name = String(formData.get(`field_name_${i}`) ?? "").trim();
    if (!name) continue;
    const rawType = String(formData.get(`field_type_${i}`) ?? "text");
    const optionsRaw = String(formData.get(`field_options_${i}`) ?? "");
    fields.push({
      name,
      label: String(formData.get(`field_label_${i}`) ?? "").trim() || name,
      type: isWidgetFieldType(rawType) ? rawType : "text",
      required: formData.get(`field_required_${i}`) === "on",
      options: optionsRaw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    });
  }
  return fields;
}

export async function createWidgetAction(botId: string, _prevState: WidgetState, formData: FormData): Promise<WidgetState> {
  const rawName = String(formData.get("name") ?? "").trim();
  const triggerDescription = String(formData.get("triggerDescription") ?? "").trim();
  const submitLabel = String(formData.get("submitLabel") ?? "").trim();

  const name = slugifyWidgetName(rawName);
  if (!name || !triggerDescription) {
    return { status: "error", message: "Name and trigger description are both required." };
  }
  const fields = readFields(formData);
  if (fields.length === 0) {
    return { status: "error", message: "Add at least one field for the bot to collect." };
  }

  // Phase 2 (ADR 0028) — a Function is entirely optional; the "callApi"
  // checkbox gates whether these fields are read at all, so a business
  // owner who just wants a collection-only form never has to think
  // about method/URL/headers.
  let api: { method: WidgetHttpMethod; url: string; headers?: Record<string, string>; writeCapable: boolean } | undefined;
  if (formData.get("callApi") === "on") {
    const rawMethod = String(formData.get("apiMethod") ?? "");
    const url = String(formData.get("apiUrl") ?? "").trim();
    if (!isWidgetHttpMethod(rawMethod) || !url) {
      return { status: "error", message: "Method and URL are required when calling an API on submit." };
    }
    if (isBlockedActionUrl(url)) {
      return { status: "error", message: "That URL isn't allowed — it must be a public https:// address." };
    }
    api = {
      method: rawMethod,
      url,
      headers: readApiHeaders(String(formData.get("apiHeaders") ?? "")),
      writeCapable: formData.get("writeCapable") === "on",
    };
  }

  try {
    const session = await getCurrentSession();
    await createWidget(session.orgId, botId, { name, triggerDescription, submitLabel, fields, api });
    revalidatePath(`/bots/${botId}/widgets`);
    return { status: "success", message: "Widget added." };
  } catch (err) {
    console.error("[createWidgetAction]", err);
    const message =
      err instanceof Error && err.message.includes("Unique constraint")
        ? "A widget with that name already exists for this bot."
        : "Couldn't save that widget. Please try again.";
    return { status: "error", message };
  }
}

export async function toggleWidgetAction(botId: string, _prevState: WidgetState, formData: FormData): Promise<WidgetState> {
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  try {
    const session = await getCurrentSession();
    await setWidgetEnabled(session.orgId, botId, id, enabled);
    revalidatePath(`/bots/${botId}/widgets`);
    return { status: "success", message: null };
  } catch (err) {
    console.error("[toggleWidgetAction]", err);
    return { status: "error", message: "Couldn't update that widget. Please try again." };
  }
}

export async function deleteWidgetAction(botId: string, _prevState: WidgetState, formData: FormData): Promise<WidgetState> {
  const id = String(formData.get("id") ?? "");
  try {
    const session = await getCurrentSession();
    await deleteWidget(session.orgId, botId, id);
    revalidatePath(`/bots/${botId}/widgets`);
    return { status: "success", message: "Widget deleted." };
  } catch (err) {
    console.error("[deleteWidgetAction]", err);
    return { status: "error", message: "Couldn't delete that widget. Please try again." };
  }
}
