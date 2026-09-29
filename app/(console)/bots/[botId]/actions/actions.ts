"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import {
  createCustomAction,
  setCustomActionEnabled,
  deleteCustomAction,
  slugifyActionName,
  HTTP_METHODS,
  type HttpMethod,
  type ActionField,
} from "@/lib/customActions";
import { isBlockedActionUrl, performActionRequest } from "@/lib/ai/tools/customAction";

export interface CustomActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export interface TestActionState {
  status: "idle" | "success" | "error";
  statusCode: number | null;
  bodyText: string | null;
  message: string | null;
}

function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

// Up to 4 fields per action — a fixed, always-rendered set of rows in
// AddActionDialog.tsx rather than a dynamic add/remove list, matching
// this app's "dumb person should be able to configure this" bar (CLAUDE.
// md's Self-serve configurability directive) without a client-state
// array to wire up. A blank name means that row isn't used.
const MAX_FIELDS = 4;

function readFields(formData: FormData): ActionField[] {
  const fields: ActionField[] = [];
  for (let i = 0; i < MAX_FIELDS; i++) {
    const name = String(formData.get(`field_name_${i}`) ?? "").trim();
    if (!name) continue;
    fields.push({
      name,
      description: String(formData.get(`field_description_${i}`) ?? "").trim(),
      required: formData.get(`field_required_${i}`) === "on",
    });
  }
  return fields;
}

function readHeaders(raw: string): Record<string, string> | undefined {
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

export async function createCustomActionAction(
  botId: string,
  _prevState: CustomActionState,
  formData: FormData,
): Promise<CustomActionState> {
  const rawName = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const method = String(formData.get("method") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const headersRaw = String(formData.get("headers") ?? "");

  const name = slugifyActionName(rawName);
  if (!name || !description || !isHttpMethod(method) || !url) {
    return { status: "error", message: "Name, description, method, and URL are all required." };
  }
  if (isBlockedActionUrl(url)) {
    return { status: "error", message: "That URL isn't allowed — it must be a public https:// address." };
  }

  try {
    const session = await getCurrentSession();
    await createCustomAction(session.orgId, botId, {
      name,
      description,
      method,
      url,
      headers: readHeaders(headersRaw),
      fields: readFields(formData),
    });
    revalidatePath(`/bots/${botId}/actions`);
    return { status: "success", message: "Action added." };
  } catch (err) {
    console.error("[createCustomActionAction]", err);
    const message =
      err instanceof Error && err.message.includes("Unique constraint")
        ? "An action with that name already exists for this bot."
        : "Couldn't save that action. Please try again.";
    return { status: "error", message };
  }
}

export async function toggleCustomActionAction(
  botId: string,
  _prevState: CustomActionState,
  formData: FormData,
): Promise<CustomActionState> {
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  try {
    const session = await getCurrentSession();
    await setCustomActionEnabled(session.orgId, botId, id, enabled);
    revalidatePath(`/bots/${botId}/actions`);
    return { status: "success", message: null };
  } catch (err) {
    console.error("[toggleCustomActionAction]", err);
    return { status: "error", message: "Couldn't update that action. Please try again." };
  }
}

export async function deleteCustomActionAction(
  botId: string,
  _prevState: CustomActionState,
  formData: FormData,
): Promise<CustomActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const session = await getCurrentSession();
    await deleteCustomAction(session.orgId, botId, id);
    revalidatePath(`/bots/${botId}/actions`);
    return { status: "success", message: "Action deleted." };
  } catch (err) {
    console.error("[deleteCustomActionAction]", err);
    return { status: "error", message: "Couldn't delete that action. Please try again." };
  }
}

// Caps how much of a real response body reaches the console — a test
// call is for confirming the shape/status of a response, not for
// browsing a large payload, and an unbounded body risks a slow render
// for a business owner who points this at the wrong endpoint.
const MAX_TEST_BODY_CHARS = 4000;

// "Test this action" (no auth/tenant scoping needed — this never
// touches the DB, it just fires the real request with whatever the form
// currently holds, before the action is even saved) so a business owner
// can confirm their own endpoint actually works, the same way Chatbase's
// real custom-action builder lets you "test with live data" before
// going live. Reuses performActionRequest — the exact same request-
// building code path the live bot tool call uses once saved, so a
// passing test here means the real thing will behave the same way.
export async function testCustomActionAction(
  _prevState: TestActionState,
  formData: FormData,
): Promise<TestActionState> {
  const method = String(formData.get("method") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const headersRaw = String(formData.get("headers") ?? "");

  if (!isHttpMethod(method) || !url) {
    return { status: "error", statusCode: null, bodyText: null, message: "Fill in a method and URL first." };
  }
  if (isBlockedActionUrl(url)) {
    return {
      status: "error",
      statusCode: null,
      bodyText: null,
      message: "That URL isn't allowed — it must be a public https:// address.",
    };
  }

  const input: Record<string, string> = {};
  for (let i = 0; i < MAX_FIELDS; i++) {
    const name = String(formData.get(`field_name_${i}`) ?? "").trim();
    const testValue = String(formData.get(`test_value_${i}`) ?? "").trim();
    if (name && testValue) input[name] = testValue;
  }

  const result = await performActionRequest(url, method, readHeaders(headersRaw) ?? {}, input);

  if (!result.ok) {
    return {
      status: "error",
      statusCode: result.status ?? null,
      bodyText: result.bodyText?.slice(0, MAX_TEST_BODY_CHARS) ?? null,
      message: result.errorMessage ?? `The endpoint responded with ${result.status}.`,
    };
  }

  return {
    status: "success",
    statusCode: result.status ?? null,
    bodyText: result.bodyText?.slice(0, MAX_TEST_BODY_CHARS) ?? "",
    message: null,
  };
}
