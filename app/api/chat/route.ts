import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/ai/chat";
import { resolveBotPublicKey } from "@/lib/db";
import { withWidgetCors, widgetCorsPreflight, handleWidgetRoute } from "@/lib/widgetCors";

// Stateless route handler — see lib/ai/chat.ts.
//
// orgId is never accepted from the client (that was the gap flagged in
// docs/open-questions.md 1a). The widget's embed snippet carries only a
// public botKey (see BotPublicKey in prisma/schema.prisma) — an opaque
// token, same trust model as a Stripe publishable key. We resolve it to
// {orgId, botId} server-side before touching anything tenant-scoped.
//
// Cross-origin by design — the widget runs on a business's own site,
// not ours. See lib/widgetCors.ts for why "*" is the right call here.
export async function OPTIONS() {
  return widgetCorsPreflight();
}

// 20 messages/minute per IP — calls the Claude API, real per-request
// cost, so this gets the stricter of the widget's two limits.
export async function POST(req: NextRequest) {
  return handleWidgetRoute(req, { limit: 20, windowMs: 60_000 }, async () => {
    const body = (await req.json()) as {
      botKey: string;
      conversationId?: string;
      message: string;
    };

    if (!body.botKey || !body.message) {
      return withWidgetCors(
        NextResponse.json({ error: "botKey and message are required" }, { status: 400 }),
      );
    }

    const resolved = await resolveBotPublicKey(body.botKey);
    if (!resolved) {
      return withWidgetCors(NextResponse.json({ error: "Invalid botKey" }, { status: 401 }));
    }

    const result = await sendMessage({
      orgId: resolved.orgId,
      botId: resolved.botId,
      conversationId: body.conversationId,
      userMessage: body.message,
    });

    return withWidgetCors(NextResponse.json(result));
  });
}
