import * as React from "react";
import { cn } from "@/lib/utils";

// A styled native checkbox rather than a fully custom-built one —
// native gets keyboard/screen-reader behavior for free (docs/
// accessibility.md), `accent-accent` (Tailwind's native accent-color
// utility, reading our own token) tints it without a custom SVG, and
// the focus ring matches every other interactive primitive.
export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-border accent-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";
