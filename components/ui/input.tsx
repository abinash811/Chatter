import * as React from "react";
import { cn } from "@/lib/utils";

// Standard shadcn/ui pattern, matching components/ui/button.tsx — every
// text input in the console goes through this, per docs/architecture.md §7.
//
// Real bug fixed 2026-09-26: this used `focus-visible:ring-accent`, but
// ADR 0014's token swap redefined `--accent` as a pale neutral-100
// background tint (for `hover:bg-accent`), not a visible ring color —
// the focus ring had been silently near-invisible against a white
// background since that migration, invisible to tsc/the build the same
// way every other Tailwind-class regression in this project's history
// has been. `ring-ring` is shadcn's own real convention for this
// (matches components/ui/button.tsx's `focus-visible:ring-ring/50`),
// confirmed visible via a real screenshot after the fix.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-row w-full rounded border border-border bg-background px-3 text-sm shadow-xs outline-hidden transition-colors hover:border-strong-border focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
