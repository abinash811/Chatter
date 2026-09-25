import * as React from "react";
import { cn } from "@/lib/utils";

// Standard shadcn/ui Card composition (Card/CardHeader/CardTitle/
// CardDescription/CardContent) — matches docs/design/preview/
// bot-editor.html's ".card" pattern: one card per concern, not a wall
// of fields in a single form.
//
// Notion-register tuning (docs/design/principles.md #4/#5/#9, per the
// research-doc recipe in docs/research/design-system-standards.md): a
// pure-white box with only a border reads as a wireframe with a line
// around it, not a calm recessed panel. A soft off-white fill
// (bg-soft-background) does the separation instead of a harsh border,
// more generous padding gives the "deliberate whitespace" Stripe/
// Notion are both described as doing, and a bumped CardTitle size
// gives real section-level hierarchy instead of matching body text.
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("rounded-lg border border-border bg-soft-background p-6 shadow-xs", className)}
      ref={ref}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div className={cn("mb-4 space-y-1.5", className)} ref={ref} {...props} />,
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={cn("text-base font-semibold", className)} ref={ref} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={cn("text-sm text-muted-foreground", className)} ref={ref} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div className={cn("space-y-4", className)} ref={ref} {...props} />,
);
CardContent.displayName = "CardContent";
