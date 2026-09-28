/**
 * @name input
 * @description Displays a form input field or a component that looks like an input field.
 * @dependencies (none)
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official source
// (github.com/shadcn-ui/ui, new-york-v4 style, via scripts/pull-shadcn-
// component.mjs) — this file was previously hand-authored in the same
// style but never actually pulled from upstream. Two deliberate deltas
// kept from the hand-authored version, not shadcn's defaults:
// `h-row` instead of shadcn's `h-9` (this app's shared row-height token,
// docs/architecture.md §7's Linear-register sizing used across every
// list/form control) and `hover:border-strong-border` (this app's own
// hover treatment, not part of shadcn's source). `ring-ring` (not
// `ring-accent`) was already the fix from the 2026-09-26 focus-ring bug
// — shadcn's real source uses this same token, so that bug is now
// impossible to reintroduce by drifting from upstream.
import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-row w-full min-w-0 rounded border border-border bg-background px-3 py-1 text-sm shadow-xs outline-hidden transition-colors selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-strong-border focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
