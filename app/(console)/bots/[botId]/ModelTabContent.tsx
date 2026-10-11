"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@/components/ui";
import { MODEL_TIER_OPTIONS, getModelTierOption } from "@/lib/ai/modelOptions";

// Split out of BotEditorForm.tsx for the same reason as
// AppearanceTabContent.tsx (scripts/check-file-length.mjs's 300-line
// cap) — still rendered inside that file's single <form>, still relies
// on Radix Select's `name` prop bubbling into that form's FormData.
// Temperature has no such native bubbling (Radix Slider isn't a form
// control the way Select/Switch are), so it's a controlled value fed
// into a hidden input instead — same shape as AppearanceTabContent's
// native accentColor input.
//
// lib/ai/modelOptions.ts's `supportsTemperature` is the real,
// SDK-verified reason the slider disables itself for Sonnet/Opus: the
// Anthropic API rejects any non-1.0 temperature on those models with a
// 400 (see that file's header comment and ADR 0026) — this isn't a
// cosmetic restriction, submitting a locked model with a moved slider
// would actually fail in production without it.
export function ModelTabContent({ model, temperature }: { model: string; temperature: number }) {
  const [selectedModelId, setSelectedModelId] = useState(model);
  const [temperatureValue, setTemperatureValue] = useState(temperature);
  const selectedTier = getModelTierOption(selectedModelId);

  // Keeps the displayed value honest: switching to a temperature-locked
  // tier snaps the slider to 1.0 (the API's own forced value) rather
  // than leaving a stale, disabled value on screen that the server
  // would silently override anyway (actions.ts re-derives this
  // server-side regardless — this is a display sync, not the real
  // enforcement).
  useEffect(() => {
    if (!selectedTier.supportsTemperature) setTemperatureValue(1);
  }, [selectedTier]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model</CardTitle>
        <CardDescription>Which Claude model this bot uses, and how creative its replies are.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="model">AI Model</Label>
          <Select name="model" defaultValue={model} onValueChange={setSelectedModelId}>
            <SelectTrigger id="model" className="mt-1 w-56" aria-label="AI Model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_TIER_OPTIONS.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">{selectedTier.description}</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">Temperature</Label>
            <span className="text-xs text-muted-foreground">{temperatureValue.toFixed(1)}</span>
          </div>
          <Slider
            id="temperature"
            className="mt-2"
            min={0}
            max={1}
            step={0.1}
            value={[temperatureValue]}
            onValueChange={([value]) => setTemperatureValue(value)}
            disabled={!selectedTier.supportsTemperature}
            aria-label="Temperature"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedTier.supportsTemperature
              ? "Lower is more focused and consistent; higher is more varied and creative."
              : `${selectedTier.label} doesn't support adjusting this — it always answers at the model's own default.`}
          </p>
          <input type="hidden" name="temperature" value={temperatureValue} />
        </div>
      </CardContent>
    </Card>
  );
}
