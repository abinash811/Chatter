import * as React from "react";
import { cn } from "@/lib/utils";

// Standard shadcn/ui Card composition (Card/CardHeader/CardTitle/
// CardDescription/CardContent) — matches docs/design/preview/
// bot-editor.html's "section-card" pattern: one card per concern, not a
// wall of fields in a single form.
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("rounded-lg border border-border p-5 shadow-xs", className)} ref={ref} {...props} />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div className={cn("mb-3 space-y-1", className)} ref={ref} {...props} />,
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={cn("text-sm font-semibold", className)} ref={ref} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={cn("text-xs text-muted-foreground", className)} ref={ref} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div className={cn("space-y-3", className)} ref={ref} {...props} />,
);
CardContent.displayName = "CardContent";
