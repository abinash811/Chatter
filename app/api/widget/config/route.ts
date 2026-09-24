import { NextRequest, NextResponse } from "next/server";
import { resolveBotPublicKey, withOrgContext } from "@/lib/db";
import { parseAppearance } from "@/lib/ai/botConfig";
import { withWidgetCors, widgetCorsPreflight, handleWidgetRoute } from "@/lib/widgetCors";

// Public endpoint the embedded widget calls before rendering, so it can
// theme itself (greeting, accent color) without the embedding site
// needing any auth. Same botKey-resolution pattern as
// app/api/chat/route.ts — never trust a client-supplied orgId; resolve
// it from the opaque key instead. Returns only cosmetic config, never
// anything from Integration/BotConfigVersion.persona/guardrails
// (guardrail #5 — no secrets or internal config to client code).
export async function OPTIONS() {
  return widgetCorsPreflight();
}

export async function GET(req: NextRequest) {
  return handleWidgetRoute(async () => {
    const botKey = req.nextUrl.searchParams.get("botKey");
    if (!botKey) {
      return withWidgetCors(NextResponse.json({ error: "botKey is required" }, { status: 400 }));
    }

    const resolved = await resolveBotPublicKey(botKey);
    if (!resolved) {
      return withWidgetCors(NextResponse.json({ error: "Invalid botKey" }, { status: 401 }));
    }

    const published = await withOrgContext(resolved.orgId, (tx) =>
      tx.botConfigVersion.findFirst({
        where: { botId: resolved.botId, status: "published" },
        orderBy: { version: "desc" },
        select: { appearance: true },
      }),
    );

    return withWidgetCors(NextResponse.json(parseAppearance(published?.appearance ?? null)));
  });
}
