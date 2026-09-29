"use client";

import {
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui";
import { WIDGET_FIELD_TYPES } from "@/lib/widgetOptions";
import type { WidgetState } from "./actions";

const FIELD_TYPE_LABELS: Record<(typeof WIDGET_FIELD_TYPES)[number], string> = {
  text: "Text",
  number: "Number",
  boolean: "Checkbox",
  select: "Dropdown",
};

// Notion register (ADR 0011) — same calm, one-time compose surface as
// AddActionDialog.tsx/AddQaDialog.tsx. Fields are a fixed set of 4 rows,
// same precedent as actions.ts's MAX_FIELDS.
export function AddWidgetDialog({
  open,
  onOpenChange,
  formAction,
  state,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formAction: (formData: FormData) => void;
  state: WidgetState;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a widget</DialogTitle>
          <DialogDescription>
            A form your bot can show inline in the chat to collect structured info from a visitor — faster and
            less error-prone than asking for it in plain text. The bot decides when to show it based on the
            description below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="booking_form" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="triggerDescription">When should the bot show this?</Label>
            <Textarea
              id="triggerDescription"
              name="triggerDescription"
              placeholder="Use this to collect appointment booking details once the visitor confirms they want to book."
              rows={2}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="submitLabel">Submit button label</Label>
            <Input id="submitLabel" name="submitLabel" placeholder="Submit" defaultValue="Submit" className="mt-1 w-40" />
          </div>

          <div>
            <Label className="mb-1 block">What should the form collect?</Label>
            <div className="space-y-3 rounded-md border border-border p-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5 border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Input name={`field_name_${i}`} placeholder="field name" className="w-28" />
                    <Input name={`field_label_${i}`} placeholder="label shown to visitor" className="flex-1" />
                    <Select name={`field_type_${i}`} defaultValue="text">
                      <SelectTrigger className="w-28" aria-label={`Field ${i + 1} type`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WIDGET_FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label className="flex items-center gap-1 whitespace-nowrap text-xs font-normal text-muted-foreground">
                      <Checkbox name={`field_required_${i}`} />
                      Required
                    </Label>
                  </div>
                  <Input
                    name={`field_options_${i}`}
                    placeholder="Dropdown options, comma-separated (only used for Dropdown fields)"
                    className="text-xs"
                    aria-label={`Dropdown options for field ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Leave a row's field name blank to skip it.</p>
          </div>

          {state.status === "error" && state.message && <p className="text-sm text-destructive">{state.message}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add widget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
