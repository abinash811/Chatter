import { NextRequest, NextResponse } from "next/server";
import { getIntegrationProvider } from "@/lib/integrations/provider";
import "@/lib/integrations";

// Deliberately doesn't touch the console session at all — `state` (set
// in getAuthorizeUrl, decoded inside handleCallback) is the only thing
// carrying orgId through the OAuth redirect. See provider.ts's comment
// on why handleCallback owns that decoding rather than the caller.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await params;
  const provider = getIntegrationProvider(providerName);
  await provider.handleCallback(req.nextUrl.searchParams);

  // ADR 0038: Integrations is a global page now, not per-bot.
  return NextResponse.redirect(new URL("/integrations", req.url));
}
