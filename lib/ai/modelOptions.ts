// Pure data, zero imports — same split as appearanceOptions.ts, so a
// client component (BotEditorForm.tsx) can import this without pulling
// in gateway.ts's server-only Anthropic SDK dependency into the browser
// bundle.

// Chatbase's "Build > Instructions" model picker (docs/research/
// competitive-landscape.md's 2026-09-28 update) offers Claude/GPT/
// Gemini; ours is Claude-tier only — ADR 0002 scoped Claude as the only
// real ModelGateway implementation, and ADR 0026 covers this feature's
// own scoping call. Real model IDs, verified against the Anthropic SDK's
// own type definitions, not recalled from memory (CLAUDE.md's "check
// real version numbers" rule) — see that ADR for the verification.
//
// `supportsTemperature`: the Anthropic SDK's own types mark `temperature`
// deprecated for every model released after Claude Opus 4.6 ("a value of
// 1.0 will be accepted for backwards compatibility, all other values
// will be rejected with a 400 error"). claude-sonnet-5 and
// claude-opus-5-5 are both newer than that cutoff; claude-haiku-4-5
// predates it (confirmed via the SDK's model-ID ordering + CHANGELOG.md,
// both newest-first) — so only the Haiku tier's temperature control is
// real. The UI (BotEditorForm.tsx) disables the slider for the other two
// rather than letting a chosen value silently no-op or 400 (guardrail
// #4: never fail silently).
export interface ModelTierOption {
  id: string;
  label: string;
  description: string;
  supportsTemperature: boolean;
}

export const MODEL_TIER_OPTIONS: ModelTierOption[] = [
  {
    id: "claude-haiku-4-5-20251001",
    label: "Haiku",
    description: "Fastest and cheapest — best for simple, high-volume support questions.",
    supportsTemperature: true,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet",
    description: "Balanced speed and quality — the right default for most bots.",
    supportsTemperature: false,
  },
  {
    id: "claude-opus-5-5",
    label: "Opus",
    description: "Most capable — best for complex, high-stakes conversations.",
    supportsTemperature: false,
  },
];

export const DEFAULT_MODEL_ID = "claude-sonnet-5";
export const DEFAULT_TEMPERATURE = 1;

export function getModelTierOption(modelId: string): ModelTierOption {
  return MODEL_TIER_OPTIONS.find((m) => m.id === modelId) ?? MODEL_TIER_OPTIONS[1];
}
