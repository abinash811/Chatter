import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, Button } from "@/components/ui";
import type { GettingStartedStep } from "./AppSidebar";

// Split out of AppSidebar.tsx (scripts/check-file-length.mjs) — the
// sidebar footer's checklist popover.
export function GettingStartedWidget({
  steps,
  completedCount,
  totalSteps,
}: {
  steps: GettingStartedStep[];
  completedCount: number;
  totalSteps: number;
}) {
  if (completedCount === totalSteps) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full flex-col items-start gap-1.5 bg-card px-2.5 py-2 text-left font-normal group-data-[collapsible=icon]:hidden"
        >
          <span className="text-xs font-medium">
            Getting started
            <span className="ml-1.5 text-muted-foreground">
              {completedCount}/{totalSteps} completed
            </span>
          </span>
          <span className="flex w-full gap-1">
            {steps.map((step, i) => (
              <span
                key={i}
                className={step.done ? "h-1 flex-1 rounded-full bg-primary" : "h-1 flex-1 rounded-full bg-muted"}
              />
            ))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-64 p-2">
        <div className="flex flex-col">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-soft-background"
            >
              {step.done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
