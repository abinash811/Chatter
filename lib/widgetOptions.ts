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

// Phase 2 (ADR 0028) — reuses lib/customActionOptions.ts's exact same
// HTTP method list rather than redefining it, but kept as its own
// export here (not imported from there) for the same client-bundle-
// isolation reason customActionOptions.ts itself was split out.
export const WIDGET_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH"] as const;
export type WidgetHttpMethod = (typeof WIDGET_HTTP_METHODS)[number];
