import * as React from "react";
import { Input, Textarea, Label, Checkbox, RadioGroup, RadioGroupItem, Switch, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Slider } from "@/components/ui";

// Real bug caught by this page's own accessibility scan, not assumed:
// the first version of this helper rendered <Label> and its control as
// unassociated siblings — no htmlFor/id, so a screen reader couldn't
// tell they were related (axe's "label" rule, critical impact).
// htmlFor/id is the real pattern every actual form in this app uses
// (see SettingsForm.tsx) — this just makes it mandatory for every
// Field instead of easy to forget.
function Field({ id, label, children }: { id: string; label: string; children: React.ReactElement<{ id?: string }> }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id })}
    </div>
  );
}

export function FormControlsSection() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Field id="ds-input-1" label="Input">
        <Input placeholder="e.g. Track my order" />
      </Field>
      <Field id="ds-input-2" label="Input (disabled)">
        <Input placeholder="Disabled" disabled />
      </Field>
      <Field id="ds-input-3" label="Input (invalid)">
        <Input defaultValue="not-a-url" aria-invalid />
      </Field>

      <Field id="ds-textarea-1" label="Textarea">
        <Textarea placeholder="You are a friendly support assistant..." rows={3} />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">Checkbox</p>
        <div className="flex items-center gap-2">
          <Checkbox id="ds-checkbox-1" defaultChecked />
          <Label htmlFor="ds-checkbox-1">Required field</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ds-checkbox-2" disabled />
          <Label htmlFor="ds-checkbox-2" className="text-disabled-foreground">
            Disabled
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Switch <span className="text-xs font-normal text-muted-foreground">(checked uses --success)</span>
        </p>
        <div className="flex items-center gap-2">
          <Switch id="ds-switch-1" defaultChecked />
          <Label htmlFor="ds-switch-1">Rate limiting</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ds-switch-2" />
          <Label htmlFor="ds-switch-2">Spam detection</Label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          RadioGroup <span className="text-xs font-normal text-muted-foreground">(no real call site yet)</span>
        </p>
        <RadioGroup defaultValue="sonnet">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sonnet" id="ds-radio-1" />
            <Label htmlFor="ds-radio-1">Sonnet</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="haiku" id="ds-radio-2" />
            <Label htmlFor="ds-radio-2">Haiku</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Select</p>
        <Select defaultValue="sonnet">
          <SelectTrigger className="w-full" aria-label="Model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sonnet">Sonnet</SelectItem>
            <SelectItem value="haiku">Haiku</SelectItem>
            <SelectItem value="opus">Opus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 sm:col-span-2 lg:col-span-1">
        <p className="text-sm font-medium">Slider</p>
        <Slider defaultValue={[0.7]} min={0} max={1} step={0.1} aria-label="Temperature" />
      </div>
    </div>
  );
}
