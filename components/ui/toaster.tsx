"use client";

import { Toaster as Sonner } from "sonner";

// Mounted once in app/layout.tsx; call toast.success(...)/toast.error(...)
// from "sonner" anywhere after that. closeButton per the user's explicit
// requirement — every toast gets a dismiss X, not just an auto-timeout.
export function Toaster() {
  return (
    <Sonner
      closeButton
      toastOptions={{
        classNames: {
          toast: "bg-background! text-foreground! border-border!",
          error: "text-destructive!",
        },
      }}
    />
  );
}
