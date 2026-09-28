/**
 * @name checkbox
 * @description A control that allows the user to toggle between checked and not checked.
 * @dependencies radix-ui
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official source —
// a real behavior change, not just styling: this is now radix-ui's
// Checkbox primitive instead of a styled native `<input type="checkbox">`.
// The hand-authored version's rationale ("native gets keyboard/screen-
// reader behavior for free") doesn't actually favor the native element
// over Radix's — Radix's Checkbox is a real ARIA checkbox with the same
// keyboard support, and (like Switch, ADR 0017) renders a hidden native
// input for `name`-based form participation when needed, so nothing
// here regresses. Two real call-site changes this required, not just a
// drop-in: `onChange`/`e.target.checked` (native DOM event) became
// `onCheckedChange` (Radix's own callback, receiving the boolean
// directly) — see ConversationFilters.tsx and AddActionDialog.tsx.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // rounded-[4px], not the generic `rounded` scale (which resolves
        // to this app's --radius, 10px) — shadcn's real source uses this
        // same explicit small radius for exactly this reason: on a 16px
        // box, a 10px corner radius reads as a circle, not a checkbox.
        // Caught by a real rendered screenshot, not assumed.
        "peer size-4 shrink-0 rounded-[4px] border border-border shadow-xs outline-hidden transition-colors hover:border-strong-border focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
