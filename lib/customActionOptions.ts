// Pure, zero-dependency option lists for the custom-action form
// (AddActionDialog.tsx) — split out from lib/customActions.ts so this
// client-facing form doesn't pull `withOrgContext`/`lib/db.ts`/
// `lib/crypto.ts` into the client bundle, same fix as lib/ai/
// appearanceOptions.ts was split from lib/ai/botConfig.ts for the same
// reason. Caught for real: importing HTTP_METHODS from lib/customActions.ts
// directly ballooned /bots/[botId]/actions's client bundle from the
// ~4kB every other bot-scoped page is to 149kB.

import type { LucideIcon } from "lucide-react";
import { CalendarX2, CalendarClock } from "lucide-react";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ActionField {
  name: string;
  description: string;
  required: boolean;
}

// Ready-made presets for AddActionDialog.tsx's template picker
// (2026-10-04, option 1 of the appointment-tooling discussion) — the
// business still points `url` at their own booking system (there's no
// single "Shopify of scheduling" to integrate against directly, see
// docs/changelog.md), but picking one of these pre-fills the name,
// model-facing description, and field list, instead of designing a
// Custom Action's schema from a blank form. `fields` must stay at
// MAX_FIELDS (4, actions.ts) or fewer.
export interface ActionTemplate {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Human-facing, shown in the template's OptionCard. */
  summary: string;
  name: string;
  /** Model-facing — prefilled into the "when should the bot use this?" field. */
  description: string;
  method: HttpMethod;
  fields: ActionField[];
}

export const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    key: "cancel_appointment",
    label: "Cancel appointment",
    icon: CalendarX2,
    summary: "Let visitors cancel an existing appointment by ID.",
    name: "cancel_appointment",
    description:
      "Use this when a visitor wants to cancel an existing appointment or booking. Call it with the appointment ID once the visitor confirms they want to cancel.",
    method: "POST",
    fields: [
      { name: "appointment_id", description: "The appointment or booking ID to cancel", required: true },
      { name: "reason", description: "Why the visitor is cancelling, if they give one", required: false },
    ],
  },
  {
    key: "reschedule_appointment",
    label: "Reschedule appointment",
    icon: CalendarClock,
    summary: "Let visitors move an existing appointment to a new time.",
    name: "reschedule_appointment",
    description:
      "Use this when a visitor wants to move an existing appointment to a different date or time. Call it with the appointment ID and the new requested time once the visitor confirms.",
    method: "POST",
    fields: [
      { name: "appointment_id", description: "The appointment or booking ID to reschedule", required: true },
      { name: "new_time", description: "The new requested date or time, in the visitor's own words", required: true },
      { name: "reason", description: "Why the visitor is rescheduling, if they give one", required: false },
    ],
  },
];
