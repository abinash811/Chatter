/**
 * @name scroll-area
 * @description Augments native scroll functionality for custom, cross-browser styling.
 * @dependencies radix-ui
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: real, current source from shadcn/ui's official
// registry (github.com/shadcn-ui/ui, new-york-v4 style) via
// scripts/pull-shadcn-component.mjs — not CARE's fork.
//
// One documented delta from stock (2026-10-08): Viewport now has
// tabIndex={0} — see its own comment below for why.
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      {/* tabIndex={0} — one documented delta from shadcn's stock source
          (2026-10-08): the real design-system reference page's own
          accessibility scan was this component's first-ever real call
          site, and immediately caught axe's "scrollable-region-
          focusable" rule failing — the Viewport already had a focus-
          visible ring class but nothing made it reachable by Tab, so
          keyboard users couldn't scroll it at all. A real, known Radix
          ScrollArea gap, not an app-specific bug. */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        tabIndex={0}
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
