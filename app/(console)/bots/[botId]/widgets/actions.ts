"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { createWidget, setWidgetEnabled, deleteWidget, slugifyWidgetName, WIDGET_FIELD_TYPES, type WidgetField, type WidgetFieldType } from "@/lib/widgets";

export interface WidgetState {
  status: "idle" | "success" | "error";
  message: string | null;
}

function isWidgetFieldType(value: string): value is WidgetFieldType {
  return (WIDGET_FIELD_TYPES as readonly string[]).includes(value);
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

  try {
    const session = await getCurrentSession();
    await createWidget(session.orgId, botId, { name, triggerDescription, submitLabel, fields });
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
