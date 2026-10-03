"use client";

import { useState } from "react";
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
import { WIDGET_FIELD_TYPES, WIDGET_HTTP_METHODS } from "@/lib/widgetOptions";
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
  // Phase 2 (ADR 0028) — progressive disclosure: a business owner who
  // just wants a collection-only form never sees method/URL/headers at
  // all, matching the same "dumb person should be able to configure
  // this" bar the fixed-field-row design already follows.
  const [callApi, setCallApi] = useState(false);

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

          <div className="rounded-md border border-border p-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox name="callApi" checked={callApi} onCheckedChange={(checked) => setCallApi(checked === true)} />
              Call an API when this form is submitted
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Without this, the visitor's answers are just sent to the bot as a message — with it, the
              submitted values are sent straight to your own endpoint.
            </p>
            {callApi && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-3">
                  <div>
                    <Label htmlFor="apiMethod">Method</Label>
                    <Select name="apiMethod" defaultValue="POST">
                      <SelectTrigger id="apiMethod" className="mt-1 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WIDGET_HTTP_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="apiUrl">URL</Label>
                    <Input id="apiUrl" name="apiUrl" type="url" placeholder="https://api.example.com/book" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="apiHeaders">Headers (optional)</Label>
                  <Textarea
                    id="apiHeaders"
                    name="apiHeaders"
                    placeholder={"Authorization: Bearer sk_live_...\nX-Api-Key: ..."}
                    rows={2}
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">One per line, as "Header-Name: value". Stored encrypted.</p>
                </div>
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox name="writeCapable" />
                  This can't be undone — require a team member's approval before it happens
                </Label>
              </div>
            )}
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
