"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label, Input, Textarea, Switch } from "@/components/ui";
import type { AbuseProtectionConfig } from "@/lib/ai/abuseProtectionOptions";

// Split out of BotEditorForm.tsx for the same reason as
// ModelTabContent.tsx (scripts/check-file-length.mjs's 300-line cap) —
// rendered as a second Card inside the same "guardrails" TabsContent,
// below the existing persona-level Guardrails textarea. ADR 0029:
// deliberately a distinct field name/data shape from that textarea
// (abuse protection vs. content policy), grouped in the console UI
// under the same tab a business owner would reasonably look for either
// concept under.
export function AbuseProtectionTabContent({ abuseProtection }: { abuseProtection: AbuseProtectionConfig }) {
  const [rateLimitEnabled, setRateLimitEnabled] = useState(abuseProtection.rateLimitEnabled);
  const [spamDetectionEnabled, setSpamDetectionEnabled] = useState(abuseProtection.spamDetectionEnabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abuse protection</CardTitle>
        <CardDescription>
          Rate limiting and spam detection — separate from the guardrails above, which are about what your bot
          says, not who's messaging it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              name="rateLimitEnabled"
              checked={rateLimitEnabled}
              onCheckedChange={setRateLimitEnabled}
              aria-label="Rate limiting"
            />
            Rate limiting
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Stop replying to a visitor once they send too many messages too quickly.
          </p>
          {rateLimitEnabled && (
            <div className="mt-3 space-y-3 pl-8">
              <div className="flex gap-3">
                <div>
                  <Label htmlFor="rateLimitMaxMessages">Max messages</Label>
                  <Input
                    id="rateLimitMaxMessages"
                    name="rateLimitMaxMessages"
                    type="number"
                    min={1}
                    className="mt-1 w-24"
                    defaultValue={abuseProtection.rateLimitMaxMessages}
                  />
                </div>
                <div>
                  <Label htmlFor="rateLimitWindowMinutes">Per (minutes)</Label>
                  <Input
                    id="rateLimitWindowMinutes"
                    name="rateLimitWindowMinutes"
                    type="number"
                    min={1}
                    className="mt-1 w-24"
                    defaultValue={abuseProtection.rateLimitWindowMinutes}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rateLimitMessage">Limit-reached message</Label>
                <Input
                  id="rateLimitMessage"
                  name="rateLimitMessage"
                  className="mt-1"
                  defaultValue={abuseProtection.rateLimitMessage}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              name="spamDetectionEnabled"
              checked={spamDetectionEnabled}
              onCheckedChange={setSpamDetectionEnabled}
              aria-label="Spam detection"
            />
            Spam detection
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatically pauses a conversation your bot flags as spam or abuse, so a human reviews it before
            anyone replies further.
          </p>
          {spamDetectionEnabled && (
            <div className="mt-3 pl-8">
              <Label htmlFor="spamGuidance">What counts as spam for this bot</Label>
              <Textarea
                id="spamGuidance"
                name="spamGuidance"
                className="mt-1"
                rows={3}
                defaultValue={abuseProtection.spamGuidance}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
