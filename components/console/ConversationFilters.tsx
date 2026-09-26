"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

// Filters are URL-driven (?botId=&range=&issues=1) so the list page
// stays a server component that refetches on navigation, matching this
// codebase's existing pattern (no client-side data fetching layer
// introduced just for this screen). ADR 0015: deliberately no "status"
// filter — that concept doesn't exist yet.

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export function ConversationFilters({ bots }: { bots: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const botId = searchParams.get("botId") ?? "all";
  const range = searchParams.get("range") ?? "all";
  const issuesOnly = searchParams.get("issues") === "1";

  // Base UI's <Select.Value> can only resolve the selected label from an
  // actually-mounted <Select.Item> — its popup content is unmounted while
  // closed, so without `items` here the trigger displays the raw value
  // ("all") instead of its label ("All bots") until first opened. Caught
  // by an actual screenshot, not assumed from the types.
  const botItems = [{ value: "all", label: "All bots" }, ...bots.map((bot) => ({ value: bot.id, label: bot.name }))];

  return (
    <div className="flex items-center gap-3">
      <Select value={botId} onValueChange={(value) => setParam("botId", value)} items={botItems}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {botItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={range} onValueChange={(value) => setParam("range", value)} items={RANGE_OPTIONS}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Checkbox
          id="issues-only"
          checked={issuesOnly}
          onChange={(e) => setParam("issues", e.target.checked ? "1" : null)}
        />
        <Label htmlFor="issues-only" className="text-sm font-normal text-muted-foreground">
          Has an issue
        </Label>
      </div>
    </div>
  );
}
