import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/ai/chat";

// Stateless route handler — see lib/ai/chat.ts. Auth/bot-key resolution
// (which orgId a widget request belongs to) isn't built yet; that's
// console/auth work, tracked as a gap here rather than faked.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    orgId: string;
    botId: string;
    conversationId?: string;
    message: string;
  };

  if (!body.orgId || !body.botId || !body.message) {
    return NextResponse.json(
      { error: "orgId, botId, and message are required" },
      { status: 400 },
    );
  }

  // TODO: orgId must come from a verified widget auth token, never a
  // client-supplied field — placeholder until the widget embed auth
  // design (docs/open-questions.md territory) is settled.
  const result = await sendMessage({
    orgId: body.orgId,
    botId: body.botId,
    conversationId: body.conversationId,
    userMessage: body.message,
  });

  return NextResponse.json(result);
}
