import * as React from "react";
import { cn } from "@/lib/utils";

// A styled native checkbox rather than a fully custom-built one —
// native gets keyboard/screen-reader behavior for free (docs/
// accessibility.md), `accent-primary` (Tailwind's native accent-color
// utility, reading our own token) tints it without a custom SVG, and
// the focus ring matches every other interactive primitive.
//
// Real bug fixed 2026-09-26: both this and the focus ring used
// `accent`/`ring-accent`, but ADR 0014's token swap redefined
// `--accent` as a pale neutral-100 background tint, not a visible
// brand/ring color — a checked box's native tick and the focus ring
// were both silently near-invisible against white. `--primary`
// (shadcn's near-black default) and `ring-ring` are the correct real
// tokens for a checked-state fill and a focus ring respectively —
// confirmed visible via a real screenshot after the fix.
export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-border accent-primary shadow-xs outline-hidden transition-colors hover:border-strong-border focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";
