"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui";

// Toaster itself is already mounted globally (app/layout.tsx) — this
// just fires a real toast through it, the same sonner call every
// server action's success/error path already uses.
export function ToastDemoButton() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success("Draft saved.")}>
        Show success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error("Couldn't save your changes — the change didn't save. Please try again.")}>
        Show error toast
      </Button>
    </div>
  );
}
