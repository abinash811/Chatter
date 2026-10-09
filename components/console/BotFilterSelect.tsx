"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

// Shared by Leads/Approvals (ADR 0038 — both moved from bot-scoped to
// org-wide pages) — the single-filter case of ConversationFilters.tsx's
// URL-driven pattern (?botId=), pulled out on its own since neither
// screen needs the date-range/status/issues filters that component also
// carries.
export function BotFilterSelect({ bots }: { bots: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const botId = searchParams.get("botId") ?? "all";
  const botItems = [{ value: "all", label: "All bots" }, ...bots.map((bot) => ({ value: bot.id, label: bot.name }))];

  function setBotId(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("botId");
    } else {
      params.set("botId", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select value={botId} onValueChange={setBotId}>
      <SelectTrigger size="sm" aria-label="Filter by bot" className="w-40">
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
  );
}
