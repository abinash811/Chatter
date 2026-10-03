/**
 * @name textarea
 * @description Displays a form textarea or a component that looks like a textarea.
 * @dependencies (none)
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official source —
// see components/ui/input.tsx's header comment for why and the same
// `ring-ring`/`hover:border-strong-border` deltas kept here.
import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full rounded border border-border bg-background px-3 py-2 text-sm shadow-xs outline-hidden transition-colors placeholder:text-muted-foreground hover:border-strong-border focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
