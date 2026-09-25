/**
 * @name alert
 * @description Displays a callout for user attention.
 * @dependencies class-variance-authority
 * @type registry:ui
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "group/alert relative w-full text-sm border grid gap-y-0.5 items-center",
    "[&>svg:not([class*=size-])]:size-4",
    // when both title+description are present: switch to top-alignment and translate svg
    "has-[>[data-slot=alert-title]+[data-slot=alert-description]]:items-start",
    "[&_svg]:has-[>[data-slot=alert-title]+[data-slot=alert-description]]:translate-y-0.5",
  ],
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive **:data-[slot=alert-description]:text-destructive/90",
        info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-800 **:data-[slot=alert-description]:text-blue-900/80 dark:**:data-[slot=alert-description]:text-blue-50/80",
        success:
          "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-50 dark:border-emerald-800 **:data-[slot=alert-description]:text-emerald-900/80 dark:**:data-[slot=alert-description]:text-emerald-50/80",
        warning:
          "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-50 dark:border-amber-800 **:data-[slot=alert-description]:text-amber-900/80 dark:**:data-[slot=alert-description]:text-amber-50/80",
        invert:
          "bg-foreground text-background border-transparent **:data-[slot=alert-description]:text-background/80",
      },
      layout: {
        vertical: [
          "rounded-lg px-4 py-3",
          "grid-cols-[0_1fr] has-[>svg]:grid-cols-[--spacing(3)_1fr] has-[>svg]:gap-x-2.5",
        ],
        horizontal: [
          "rounded-lg px-4 py-3",
          "grid-cols-[0_1fr_auto] has-[>svg]:grid-cols-[--spacing(3)_1fr_auto] has-[>svg]:gap-x-2.5",
          // when both title+description present, span action across both rows
          "**:data-[slot=alert-action]:has-[>[data-slot=alert-title]+[data-slot=alert-description]]:row-end-3",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
      layout: "vertical",
    },
  }
);

function Alert({
  className,
  variant,
  layout,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-layout={layout ?? "vertical"}
      role="alert"
      className={cn(alertVariants({ variant, layout }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "hover:[&_a]:text-foreground col-start-2 font-medium [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground hover:[&_a]:text-foreground col-start-2 text-sm text-balance md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        // vertical (default): below description in col 2
        "col-start-2 flex flex-wrap gap-2 pt-2",
        // horizontal: col 3, start at row 1, self-centered, no top padding
        "group-data-[layout=horizontal]/alert:col-start-3 group-data-[layout=horizontal]/alert:row-start-1 group-data-[layout=horizontal]/alert:flex-nowrap group-data-[layout=horizontal]/alert:self-center group-data-[layout=horizontal]/alert:pt-0 group-data-[layout=horizontal]/alert:pl-4",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
