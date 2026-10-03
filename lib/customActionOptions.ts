// Pure, zero-dependency option lists for the custom-action form
// (AddActionDialog.tsx) — split out from lib/customActions.ts so this
// client-facing form doesn't pull `withOrgContext`/`lib/db.ts`/
// `lib/crypto.ts` into the client bundle, same fix as lib/ai/
// appearanceOptions.ts was split from lib/ai/botConfig.ts for the same
// reason. Caught for real: importing HTTP_METHODS from lib/customActions.ts
// directly ballooned /bots/[botId]/actions's client bundle from the
// ~4kB every other bot-scoped page is to 149kB.

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ActionField {
  name: string;
  description: string;
  required: boolean;
}
