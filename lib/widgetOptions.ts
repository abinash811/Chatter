// Pure, zero-dependency option lists for the widget builder form
// (AddWidgetDialog.tsx) — split out from lib/widgets.ts so this
// client-facing form doesn't pull `withOrgContext`/`lib/db.ts` into the
// client bundle, same fix as lib/customActionOptions.ts.

export const WIDGET_FIELD_TYPES = ["text", "number", "boolean", "select"] as const;
export type WidgetFieldType = (typeof WIDGET_FIELD_TYPES)[number];

export interface WidgetField {
  name: string;
  label: string;
  type: WidgetFieldType;
  required: boolean;
  // Only meaningful for type "select" — comma-separated in the form,
  // stored as a real array.
  options: string[];
}
