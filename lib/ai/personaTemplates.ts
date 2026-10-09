// Pure data, zero imports — same reasoning as lib/ai/appearanceOptions.ts:
// BotEditorForm.tsx (a "use client" component) needs this, and keeping it
// dependency-free means it can't accidentally pull server-only code (e.g.
// lib/db.ts's PrismaClient, if this ever lived in lib/ai/botConfig.ts)
// into the browser bundle.
//
// Scope decided 2026-09-27 (docs/open-questions.md, now resolved):
// 3 ecommerce use-case templates, persona text only — deliberately NOT
// bundled with a tool subset (decoupled, matching Chatbase's real UX —
// see docs/research/persona-template-ux.md). Picking one only fills the
// Persona tab's textarea; guardrails and enabled tools are untouched.
// Hardcoded, not database-backed — adding a 4th template later is a code
// change, same pattern as AVATAR_EMOJI_OPTIONS.

export interface PersonaTemplate {
  id: string;
  label: string;
  persona: string;
}

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: "support",
    label: "Customer support",
    persona:
      "You are a friendly, patient customer support assistant for this store. Answer questions about orders, shipping, returns, and products using what you know from the knowledge base — never guess or make up details you're not sure of. If you can't resolve something, say so plainly and offer to connect the visitor with a person.",
  },
  {
    id: "sales",
    label: "Sales assistant",
    persona:
      "You are an upbeat, helpful shopping assistant for this store. Help visitors find the right product by asking a couple of clarifying questions, then recommend options from the knowledge base and explain why they fit. Be genuinely helpful, not pushy — if nothing in the catalog fits what they need, say so instead of forcing a recommendation.",
  },
  {
    id: "lead-gen",
    label: "Lead generation",
    persona:
      "You are a warm, low-pressure assistant whose main goal is to understand what a visitor is looking for and capture their contact details so the team can follow up. Answer basic questions from the knowledge base, but steer the conversation toward getting a name and email or phone number once you understand their interest — always explain why you're asking, never demand it upfront.",
  },
];
