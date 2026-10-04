"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Badge,
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
import { OptionCard } from "@/components/console/OptionCard";
import { HTTP_METHODS, ACTION_TEMPLATES } from "@/lib/customActionOptions";
import type { CustomActionState, TestActionState } from "./actions";

// Notion register (ADR 0011) — a calm, one-time compose surface, same
// choice as AddQaDialog.tsx. Fields are a fixed set of 4 rows rather than
// a dynamic add/remove list — see actions.ts's MAX_FIELDS comment.
export function AddActionDialog({
  open,
  onOpenChange,
  formAction,
  state,
  isPending,
  testFormAction,
  testState,
  isTesting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formAction: (formData: FormData) => void;
  state: CustomActionState;
  isPending: boolean;
  testFormAction: (formData: FormData) => void;
  testState: TestActionState;
  isTesting: boolean;
}) {
  // Reads the create-action form's current (unsaved) values to fire a
  // real test request — a second <form> can't easily share these fields
  // without duplicating every input, so the Test button instead builds
  // FormData straight from the DOM. type="button" keeps it from
  // submitting/validating the create form itself.
  const formRef = useRef<HTMLFormElement>(null);

  // "blank" or an ACTION_TEMPLATES key. Used as the form's own `key` so
  // picking a template remounts it with fresh `defaultValue`s instead of
  // needing every field to become a controlled input just for this.
  const [templateKey, setTemplateKey] = useState("blank");
  const template = ACTION_TEMPLATES.find((t) => t.key === templateKey) ?? null;

  useEffect(() => {
    if (!open) setTemplateKey("blank");
  }, [open]);

  function handleTest() {
    if (!formRef.current) return;
    testFormAction(new FormData(formRef.current));
  }

  function fieldDefaults(index: number) {
    return template?.fields[index] ?? { name: "", description: "", required: false };
  }

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

        {/* A single-column stacked list, not a grid — the dialog is only
            sm:max-w-lg (512px), and OptionCard's icon+title+description+
            action layout genuinely needs more width than 3 columns leaves
            it (caught by a real screenshot: titles wrapped, the
            "Selected" button overflowed its card border). */}
        <div className="space-y-2">
          <OptionCard
            icon={FileText}
            title="Start from scratch"
            description="Define your own endpoint and fields."
            trailing={
              <Button
                type="button"
                size="sm"
                variant={templateKey === "blank" ? "default" : "outline"}
                onClick={() => setTemplateKey("blank")}
              >
                {templateKey === "blank" ? "Selected" : "Use"}
              </Button>
            }
          />
          {ACTION_TEMPLATES.map((t) => (
            <OptionCard
              key={t.key}
              icon={t.icon}
              title={t.label}
              description={t.summary}
              trailing={
                <Button
                  type="button"
                  size="sm"
                  variant={templateKey === t.key ? "default" : "outline"}
                  onClick={() => setTemplateKey(t.key)}
                >
                  {templateKey === t.key ? "Selected" : "Use"}
                </Button>
              }
            />
          ))}
        </div>

        <form ref={formRef} key={templateKey} action={formAction} className="mt-3 space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="check_availability"
              defaultValue={template?.name ?? ""}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">When should the bot use this?</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Use this to check appointment availability for a given date."
              defaultValue={template?.description ?? ""}
              rows={2}
              className="mt-1"
              required
            />
          </div>
          <div className="flex gap-3">
            <div>
              <Label htmlFor="method">Method</Label>
              <Select name="method" defaultValue={template?.method ?? "POST"}>
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
            <div className="space-y-3 rounded-md border border-border p-2">
              {[0, 1, 2, 3].map((i) => {
                const defaults = fieldDefaults(i);
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input name={`field_name_${i}`} placeholder="field name" defaultValue={defaults.name} className="w-28" />
                      <Input
                        name={`field_description_${i}`}
                        placeholder="what it is"
                        defaultValue={defaults.description}
                        className="flex-1"
                      />
                      <Label className="flex items-center gap-1 whitespace-nowrap text-xs font-normal text-muted-foreground">
                        <Checkbox name={`field_required_${i}`} defaultChecked={defaults.required} />
                        Required
                      </Label>
                    </div>
                    <Input
                      name={`test_value_${i}`}
                      placeholder="Test value (only used by the Test button below)"
                      className="text-xs"
                      aria-label={`Test value for field ${i + 1}`}
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Leave a row's field name blank to skip it.</p>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Test this action</p>
              <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                {isTesting ? "Testing..." : "Test"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fires a real request to the URL above with the test values you typed, so you can confirm it works
              before saving — nothing is stored from this.
            </p>
            {testState.status !== "idle" && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2">
                  {testState.statusCode !== null && (
                    <Badge variant={testState.status === "success" ? "default" : "destructive"}>
                      {testState.statusCode}
                    </Badge>
                  )}
                  {testState.message && <p className="text-sm text-destructive">{testState.message}</p>}
                  {testState.status === "success" && !testState.message && (
                    <p className="text-sm text-muted-foreground">Request succeeded.</p>
                  )}
                </div>
                {testState.bodyText && (
                  <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">{testState.bodyText}</pre>
                )}
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
              {isPending ? "Adding..." : "Add action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
