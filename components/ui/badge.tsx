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
// them.
//
// 2026-10-08: `default` no longer renders as a solid `bg-primary` fill.
// A Badge is a status chip, never a clickable action — solid black is
// now reserved for the one real primary-action Button per screen (user
// directive, moving away from a flat monochrome treatment toward
// Chatbase's lighter one). Every call site that used `default` for an
// actual positive/active signal (Published, Connected, Ongoing, a
// passing test) moved to the new `success` variant instead; `default`
// itself is now just a neutral light pill, same visual weight as
// `muted`, kept only so an un-set variant prop doesn't fall back to
// solid black. Added `success`/`warning`/`alert` as light-tint variants
// (same `bg-X/10 text-X-strong` shape `destructive` already used) to
// put the previously-unused `--warning`/`--alert` tokens to real work.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-muted-foreground",
        success: "bg-success/10 text-success-strong",
        warning: "bg-warning/10 text-warning-strong",
        alert: "bg-alert/10 text-alert-strong",
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
