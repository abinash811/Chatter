"use client";

import { useTransition } from "react";
import { loadSampleDataAction } from "./actions";
import { Button } from "@/components/ui";

// One click, no form fields to fill — same useTransition pattern as
// NewBotDialog.tsx (disables itself in flight so a double-click can't
// create two demo bots); no dialog needed since there's nothing to ask.
export function LoadSampleDataButton({ label = "Load sample data" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(() => loadSampleDataAction())}>
      {isPending ? "Loading..." : label}
    </Button>
  );
}
