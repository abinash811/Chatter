import { describe, it, expect } from "vitest";
import { ACTION_TEMPLATES } from "@/lib/customActionOptions";
import { slugifyActionName } from "@/lib/customActions";

// Guards the ready-made templates (2026-10-04) against silently breaking
// the constraints AddActionDialog.tsx and actions.ts assume: a fixed set
// of at most 4 field rows (actions.ts's MAX_FIELDS), and a `name` that's
// already in the slug shape the server stores it as.
describe("ACTION_TEMPLATES", () => {
  it("each template has a unique key", () => {
    const keys = ACTION_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each template's name is already a valid slug", () => {
    for (const template of ACTION_TEMPLATES) {
      expect(slugifyActionName(template.name)).toBe(template.name);
    }
  });

  it("each template has at most 4 fields (AddActionDialog's fixed row count)", () => {
    for (const template of ACTION_TEMPLATES) {
      expect(template.fields.length).toBeLessThanOrEqual(4);
    }
  });

  it("each template has a non-empty description for every field", () => {
    for (const template of ACTION_TEMPLATES) {
      for (const field of template.fields) {
        expect(field.name.length).toBeGreaterThan(0);
        expect(field.description.length).toBeGreaterThan(0);
      }
    }
  });
});
