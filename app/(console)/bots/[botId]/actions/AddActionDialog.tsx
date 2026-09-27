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
import { HTTP_METHODS } from "@/lib/customActionOptions";
import type { CustomActionState } from "./actions";

// Notion register (ADR 0011) — a calm, one-time compose surface, same
// choice as AddQaDialog.tsx. Fields are a fixed set of 4 rows rather than
// a dynamic add/remove list — see actions.ts's MAX_FIELDS comment.
export function AddActionDialog({
  open,
  onOpenChange,
  formAction,
  state,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formAction: (formData: FormData) => void;
  state: CustomActionState;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a custom action</DialogTitle>
          <DialogDescription>
            Let your bot call your own endpoint — a booking system, a CRM, anything with a URL. The bot decides
            when to use it based on the description below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="check_availability" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="description">When should the bot use this?</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Use this to check appointment availability for a given date."
              rows={2}
              className="mt-1"
              required
            />
          </div>
          <div className="flex gap-3">
            <div>
              <Label htmlFor="method">Method</Label>
              <Select name="method" defaultValue="POST">
                <SelectTrigger id="method" className="mt-1 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" type="url" placeholder="https://api.example.com/availability" className="mt-1" required />
            </div>
          </div>
          <div>
            <Label htmlFor="headers">Headers (optional)</Label>
            <Textarea
              id="headers"
              name="headers"
              placeholder={"Authorization: Bearer sk_live_...\nX-Api-Key: ..."}
              rows={2}
              className="mt-1 font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">One per line, as "Header-Name: value". Stored encrypted.</p>
          </div>
          <div>
            <Label className="mb-1 block">What should the bot ask the visitor for?</Label>
            <div className="space-y-2 rounded-md border border-border p-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input name={`field_name_${i}`} placeholder="field name" className="w-32" />
                  <Input name={`field_description_${i}`} placeholder="what it is" className="flex-1" />
                  <Label className="flex items-center gap-1 whitespace-nowrap text-xs font-normal text-muted-foreground">
                    <Checkbox name={`field_required_${i}`} />
                    Required
                  </Label>
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
              {isPending ? "Adding..." : "Add action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
