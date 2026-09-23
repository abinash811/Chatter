import { NextRequest, NextResponse } from "next/server";
import { getIntegrationProvider } from "@/lib/integrations/provider";
import "@/lib/integrations";

// Deliberately doesn't touch the console session at all — `state` (set
// in getAuthorizeUrl, decoded inside handleCallback) is the only thing
// carrying orgId/botId through the OAuth redirect. See provider.ts's
// comment on why handleCallback owns that decoding rather than the
// caller.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await params;
  const provider = getIntegrationProvider(providerName);
  const { botId } = await provider.handleCallback(req.nextUrl.searchParams);

  return NextResponse.redirect(new URL(`/bots/${botId}/integrations`, req.url));
}
