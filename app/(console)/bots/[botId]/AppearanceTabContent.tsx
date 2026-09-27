import {
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  AVATAR_EMOJI_OPTIONS,
  WIDGET_POSITIONS,
  MAX_SUGGESTED_REPLIES,
  type AvatarEmoji,
  type WidgetPosition,
} from "@/lib/ai/appearanceOptions";

// Split out of BotEditorForm.tsx (2026-09-27) purely to stay under
// scripts/check-file-length.mjs's 300-line cap once the persona-template
// picker was added there — no behavior change, still rendered inside that
// file's single <form>, still relies on Radix Select's `name` prop
// bubbling into that form's FormData (see BotEditorForm.tsx's own Select
// usage for the same pattern).
export function AppearanceTabContent({
  greeting,
  accentColor,
  avatarEmoji,
  position,
  suggestedReplies,
  embedSnippet,
}: {
  greeting: string;
  accentColor: string;
  avatarEmoji: AvatarEmoji;
  position: WidgetPosition;
  suggestedReplies: string[];
  embedSnippet: string;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            What visitors see before they've sent a message, and the widget's accent color.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="greeting">Greeting</Label>
            <Input id="greeting" name="greeting" defaultValue={greeting} className="mt-1" />
          </div>
          <div className="flex gap-6">
            <div>
              <Label htmlFor="accentColor">Accent color</Label>
              <input
                id="accentColor"
                type="color"
                name="accentColor"
                defaultValue={accentColor}
                className="mt-1 block h-row-sm w-16 rounded border border-border bg-transparent shadow-xs transition-colors hover:border-strong-border"
              />
            </div>
            <div>
              <Label htmlFor="avatarEmoji">Avatar</Label>
              <Select name="avatarEmoji" defaultValue={avatarEmoji}>
                <SelectTrigger id="avatarEmoji" className="mt-1 w-20" aria-label="Widget avatar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVATAR_EMOJI_OPTIONS.map((emoji) => (
                    <SelectItem key={emoji} value={emoji}>
                      {emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="position">Position on page</Label>
              <Select name="position" defaultValue={position}>
                <SelectTrigger id="position" className="mt-1 w-40" aria-label="Widget position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos === "bottom-right" ? "Bottom right" : "Bottom left"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested replies</CardTitle>
          <CardDescription>
            Up to {MAX_SUGGESTED_REPLIES} buttons shown under your bot's first message, so a visitor has something
            to tap instead of a blank box. Leave a row blank to skip it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: MAX_SUGGESTED_REPLIES }, (_, i) => (
            <div key={i}>
              <Label htmlFor={`suggestedReply_${i}`} className="sr-only">
                Suggested reply {i + 1}
              </Label>
              <Input
                id={`suggestedReply_${i}`}
                name={`suggestedReply_${i}`}
                defaultValue={suggestedReplies[i] ?? ""}
                placeholder={i === 0 ? "e.g. What are your hours?" : "e.g. Track my order"}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed on your site</CardTitle>
          <CardDescription>
            Paste this before the closing <code>&lt;/body&gt;</code> tag on any page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* tabIndex + role — a real axe-core scan
              (tests/e2e/accessibility.spec.ts) flagged this as a
              scrollable region with no keyboard access (WCAG
              2.1.1/2.1.3): overflow-x-auto content needs to be
              focusable so a keyboard user can actually scroll it. */}
          <pre
            className="overflow-x-auto rounded bg-muted p-3 text-xs"
            tabIndex={0}
            role="region"
            aria-label="Embed snippet"
          >
            {embedSnippet}
          </pre>
        </CardContent>
      </Card>
    </>
  );
}
