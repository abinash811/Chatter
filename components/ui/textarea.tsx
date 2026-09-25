import * as React from "react";
import { cn } from "@/lib/utils";

// Matches components/ui/input.tsx's pattern — every multi-line text
// field in the console goes through this, not a raw <textarea>.
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "w-full rounded border border-border bg-background p-3 text-sm shadow-xs outline-hidden transition-colors hover:border-strong-border focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
