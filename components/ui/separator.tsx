/**
 * @name separator
 * @description Visually or semantically separates content.
 * @dependencies radix-ui
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: real, current source from shadcn/ui's official
// registry (github.com/shadcn-ui/ui, new-york-v4 style) via
// scripts/pull-shadcn-component.mjs — not CARE's fork.
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
