import * as React from "react";
import { cn } from "@/lib/utils";

// Standard shadcn/ui pattern, matching components/ui/button.tsx — every
// text input in the console goes through this, per docs/architecture.md §7.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-row w-full rounded border border-border bg-transparent px-3 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
