/**
 * @name skeleton
 * @description Use to show a placeholder while content is loading.
 * @dependencies none
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: real, current source from shadcn/ui's official
// registry (github.com/shadcn-ui/ui, new-york-v4 style) via
// scripts/pull-shadcn-component.mjs — not CARE's fork.
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
