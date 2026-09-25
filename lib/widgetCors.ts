import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// The widget embeds on an arbitrary business's site — a different
// origin than ours — so its public endpoints (/api/chat,
// /api/widget/config) need permissive CORS. Deliberately wildcard
// rather than an allowlist: these endpoints are keyed by an opaque
// botKey, not cookies/session, so there's no origin-based trust boundary
// to protect here (same reasoning as guardrail #5 — the widget never
// holds anything more sensitive than the public key). Never add
// credentials mode alongside "*" — that combination is rejected by
// browsers anyway, and would be the wrong call if it weren't.
export const WIDGET_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function withWidgetCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(WIDGET_CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function widgetCorsPreflight(): NextResponse {
  return withWidgetCors(new NextResponse(null, { status: 204 }));
}

// Found by actually running the widget end to end against a real
// cross-origin host page: an *unhandled* error in a widget route skips
// withWidgetCors entirely (Next's default error response carries no
// CORS headers), so the browser reports it as "blocked by CORS policy"
// — masking the real error from whoever's debugging via devtools. Every
// widget route handler's body must go through this, not just its
// success path, so a real failure (the model API down, a DB hiccup)
// is visible for what it is instead of looking like a CORS
// misconfiguration. Never leak the actual error message to this public,
// unauthenticated endpoint — log it server-side, return a generic one.
// Per-IP, since visitors are anonymous (no session/API key to key on) —
// see lib/rateLimit.ts. `limit`/`windowMs` are per-route: the chat route
// calls the Claude API (real cost) and gets a stricter limit than the
// cosmetic config-fetch route.
export async function handleWidgetRoute(
  req: Request,
  { limit, windowMs }: { limit: number; windowMs: number },
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = `${req.url}:${getClientIp(req)}`;
  if (!checkRateLimit(key, limit, windowMs)) {
    return withWidgetCors(
      NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 }),
    );
  }

  try {
    return await fn();
  } catch (err) {
    console.error("[widget route error]", err);
    return withWidgetCors(
      NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }),
    );
  }
}
