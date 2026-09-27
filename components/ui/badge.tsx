import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "muted" | "destructive";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        // bg-primary, not bg-accent — docs/design/preview/bots-list.html
        // (the approved mockup, checked 2026-09-27 against real Chatbase/
        // Claude Console references) specifies a solid, high-contrast fill
        // for a positive/active state ("Published") vs. a muted pill for
        // "Draft only." Pre-monochrome that fill was the brand's own
        // emerald; post-ADR-0014 the equivalent solid color is --primary
        // (black). `bg-accent` was the same near-invisible-pale-tint bug
        // (--accent redefined to oklch(97%) by ADR 0014) already fixed on
        // Input/Textarea/Checkbox/BotsTable's focus rings — never audited
        // here, so "Published" rendered almost identically to "Draft only."
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "muted" && "bg-muted text-muted-foreground",
        variant === "destructive" && "bg-destructive/10 text-destructive",
        className,
      )}
    >
      {children}
    </span>
  );
}
