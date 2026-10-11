/**
 * @name sonner
 * @description An opinionated toast component for React.
 * @dependencies sonner
 * @type registry:ui
 */
// ADR 0014 + ADR 0017: rebased onto shadcn/ui's real official "sonner"
// registry component. Real, deliberate delta: shadcn's source reads
// `theme` from `next-themes`' `useTheme()`, but this app has no theme
// provider and is light-mode only (app/globals.css) — pulling in
// next-themes for a single hardcoded value would be a real, unjustified
// new dependency, so `theme` is hardcoded to `"light"` instead.
// `closeButton` and the `classNames` overrides (background/border/
// destructive-text tokens) are this app's own requirements, kept as
// deltas the same way every other rebased primitive keeps its real
// customizations.
"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      closeButton
      toastOptions={{
        classNames: {
          toast: "bg-background! text-foreground! border-border!",
          error: "text-destructive!",
        },
      }}
      {...props}
    />
  );
}
