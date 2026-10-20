/**
 * @name label
 * @description Renders an accessible label associated with controls.
 * @dependencies radix-ui
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official source —
// a real behavior upgrade over the hand-authored version, not just a
// styling change: this is now radix-ui's real Label primitive, which
// correctly forwards a click to its associated control even when
// that control is a Radix component (Switch/Checkbox/RadioGroup) that
// doesn't expose a native `id`-targetable element the same way a plain
// `<label htmlFor>` does. font-medium/text-sm kept from before.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label as LabelPrimitive } from "radix-ui";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-medium leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
