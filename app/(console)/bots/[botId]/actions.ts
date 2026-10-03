"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentSession } from "@/lib/auth";
import {
  saveDraft,
  publishDraft,
  AVATAR_EMOJI_OPTIONS,
  WIDGET_POSITIONS,
  MAX_SUGGESTED_REPLIES,
  DEFAULT_APPEARANCE,
} from "@/lib/ai/botConfig";
import { MODEL_TIER_OPTIONS, DEFAULT_MODEL_ID, DEFAULT_TEMPERATURE, getModelTierOption } from "@/lib/ai/modelOptions";
import { DEFAULT_ABUSE_PROTECTION } from "@/lib/ai/abuseProtectionOptions";
import { listAllTools } from "@/lib/ai/tools/registry";
import { sendMessage } from "@/lib/ai/chat";
import type { RenderWidgetPayload } from "@/lib/ai/tools/widget";
import "@/lib/ai/tools";

function parsePositiveInt(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export interface SaveDraftState {
  status: "idle" | "success" | "error";
  message: string | null;
}

// Bound to a specific botId via .bind(null, botId) before being passed
// to useActionState (BotEditorForm.tsx) — see app/login/actions.ts for
// the same action-state pattern. Errors are caught here, not left to
// the framework's default error boundary, so the message stays in plain
// words instead of a stack trace.
export async function saveDraftAction(
  botId: string,
  _prevState: SaveDraftState,
  formData: FormData,
): Promise<SaveDraftState> {
  try {
    const session = await getCurrentSession();
    const modelId = MODEL_TIER_OPTIONS.some((m) => m.id === formData.get("model"))
      ? String(formData.get("model"))
      : DEFAULT_MODEL_ID;
    // Never trust the client alone for the temperature-lock rule (the
    // slider is disabled in the UI for a model that doesn't support it,
    // but a disabled control's value still submits, and a form can be
    // driven directly) — a real 400 in production from a stale/forced
    // value would violate guardrail #4, so the server re-derives whether
    // this model allows a custom temperature and pins it to the API's
    // own default otherwise.
    const modelTier = getModelTierOption(modelId);
    const requestedTemperature = Number(formData.get("temperature"));
    const temperature = modelTier.supportsTemperature && Number.isFinite(requestedTemperature)
      ? Math.min(1, Math.max(0, requestedTemperature))
      : DEFAULT_TEMPERATURE;
    await saveDraft(session.orgId, botId, {
      persona: String(formData.get("persona") ?? ""),
      guardrails: String(formData.get("guardrails") ?? ""),
      model: modelId,
      temperature,
      tools: listAllTools()
        .map((t) => t.name)
        .filter((name) => formData.get(`tool_${name}`) === "on"),
      appearance: {
        greeting: String(formData.get("greeting") ?? ""),
        accentColor: String(formData.get("accentColor") ?? "#065f46"), // allow-raw-color — form fallback, not console UI (matches lib/ai/botConfig.ts's DEFAULT_APPEARANCE)
        avatarEmoji: (AVATAR_EMOJI_OPTIONS as readonly string[]).includes(String(formData.get("avatarEmoji")))
          ? (formData.get("avatarEmoji") as (typeof AVATAR_EMOJI_OPTIONS)[number])
          : DEFAULT_APPEARANCE.avatarEmoji,
        position: (WIDGET_POSITIONS as readonly string[]).includes(String(formData.get("position")))
          ? (formData.get("position") as (typeof WIDGET_POSITIONS)[number])
          : DEFAULT_APPEARANCE.position,
        suggestedReplies: Array.from({ length: MAX_SUGGESTED_REPLIES }, (_, i) =>
          String(formData.get(`suggestedReply_${i}`) ?? "").trim(),
        ).filter(Boolean),
      },
      abuseProtection: {
        rateLimitEnabled: formData.get("rateLimitEnabled") === "on",
        rateLimitMaxMessages: parsePositiveInt(
          formData.get("rateLimitMaxMessages"),
          DEFAULT_ABUSE_PROTECTION.rateLimitMaxMessages,
        ),
        rateLimitWindowMinutes: parsePositiveInt(
          formData.get("rateLimitWindowMinutes"),
          DEFAULT_ABUSE_PROTECTION.rateLimitWindowMinutes,
        ),
        rateLimitMessage:
          String(formData.get("rateLimitMessage") ?? "").trim() || DEFAULT_ABUSE_PROTECTION.rateLimitMessage,
        spamDetectionEnabled: formData.get("spamDetectionEnabled") === "on",
        spamGuidance: String(formData.get("spamGuidance") ?? "").trim() || DEFAULT_ABUSE_PROTECTION.spamGuidance,
      },
    });
    revalidatePath(`/bots/${botId}`);
    return { status: "success", message: "Draft saved." };
  } catch (err) {
    console.error("[saveDraftAction]", err);
    return { status: "error", message: "Couldn't save your changes. Please try again." };
  }
}

export async function publishAction(botId: string, _prevState: SaveDraftState): Promise<SaveDraftState> {
  try {
    const session = await getCurrentSession();
    await publishDraft(session.orgId, botId);
    revalidatePath(`/bots/${botId}`);
    return { status: "success", message: "Published — visitors will see this version now." };
  } catch (err) {
    console.error("[publishAction]", err);
    return { status: "error", message: "Couldn't publish. Please try again." };
  }
}

export interface PreviewMessageState {
  status: "idle" | "success" | "error";
  message: string | null;
  conversationId?: string;
  reply?: string;
  /** ADR 0028 — set when this preview turn triggered an in-chat widget. */
  widget?: RenderWidgetPayload;
}

// "Test your bot" preview (2026-09-27) — an authenticated console user
// testing their own bot, so this calls lib/ai/chat.ts's sendMessage
// directly (same real chat loop the widget's POST /api/chat route
// calls) rather than going through that route's botKey/CORS/rate-limit
// path, which exists specifically for anonymous visitors on someone
// else's site (docs/api.md). Preview conversations are written to the
// same Conversation/Message tables as a real visitor's — they show up
// in the conversation inbox like any other, matching the reference
// product's own behavior (its Playground's test messages appear in its
// Chat logs too, per docs/research/competitive-landscape.md's
// screenshots) rather than inventing a separate "is this a preview"
// concept for v1.
export async function sendPreviewMessageAction(
  botId: string,
  _prevState: PreviewMessageState,
  formData: FormData,
): Promise<PreviewMessageState> {
  const userMessage = String(formData.get("message") ?? "").trim();
  if (!userMessage) {
    return { status: "error", message: "Type a message first." };
  }
  const conversationId = String(formData.get("conversationId") ?? "") || undefined;

  try {
    const session = await getCurrentSession();
    const result = await sendMessage({ orgId: session.orgId, botId, conversationId, userMessage, source: "playground" });
    return {
      status: "success",
      message: null,
      conversationId: result.conversationId,
      reply: result.reply ?? undefined,
      widget: result.widget,
    };
  } catch (err) {
    console.error("[sendPreviewMessageAction]", err);
    let message = "Couldn't get a reply. Please try again.";
    if (err instanceof Error && err.message.includes("no published config")) {
      message = "Publish this bot before testing it — the preview uses the published version, same as a real visitor would see.";
    } else if (err instanceof Anthropic.AuthenticationError) {
      message = "The Claude API key isn't set up yet — ask an admin to add one in Settings.";
    }
    return { status: "error", message };
  }
}
