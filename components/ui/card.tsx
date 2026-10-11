/**
 * @name card
 * @description Displays a card with header, content, and footer.
 * @dependencies (none)
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official structure
// (adds `CardAction`/`CardFooter`, unused today but kept for parity with
// upstream — no reason to drop exports a future screen might need).
// Real, deliberate Notion-register deltas kept from the hand-authored
// version, not shadcn's defaults (docs/design/principles.md #4/#5/#9):
// `bg-soft-background` instead of shadcn's `bg-card`/`shadow-sm` — a
// pure-white box with only a border read as a wireframe, not a calm
// recessed panel; more generous `p-6` padding and a bumped `CardTitle`
// size (`text-base`, not shadcn's plain `leading-none`) for real
// section-level hierarchy, matching docs/design/preview/bot-editor.html.
import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-lg border border-border bg-soft-background p-6 shadow-xs", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 mb-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("text-base font-semibold leading-none", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("space-y-4", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
