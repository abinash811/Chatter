/**
 * @name badge
 * @description Displays a badge or a component that looks like a badge.
 * @dependencies class-variance-authority radix-ui
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official structure
// (cva-driven variants, `asChild` support, aria-invalid/focus-visible
// states) — the hand-authored version had none of those mechanical
// parts (component-checklist.md item 9). Variant names kept as this
// app's own (`default`/`muted`/`destructive`, not shadcn's `secondary`/
// `outline`/`ghost`/`link`) since every call site already depends on
// them — see docs/design/design-system.md's provenance note on
// `bg-primary` vs `bg-accent` for why `default` specifically must stay
// a solid fill, not shadcn's own `default` styling verbatim.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        muted: "bg-muted text-muted-foreground",
        destructive: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
