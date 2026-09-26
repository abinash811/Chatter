"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { cn } from "@/lib/utils";

// docs/design/principles.md #10's persistent-top-bar pattern, extended
// across all 3 bot-scoped pages (editor/knowledge/integrations) instead
// of just the editor — 2026-09-26 decision, matching the Chatbase
// reference screenshot's own bot switcher (workspace / bot / type),
// scoped to what we actually have: no "type" concept, so just the bot
// name and a switcher.
//
// Switching bots preserves the current page (Knowledge stays on
// Knowledge for the new bot) rather than always landing on the editor —
// the pathname's segment after /bots/{botId} is reused verbatim.
const NAV_ITEMS = [
  { subpath: "", label: "Editor" },
  { subpath: "/knowledge", label: "Knowledge" },
  { subpath: "/integrations", label: "Integrations" },
];

export function BotTopBar({ botId, bots }: { botId: string; bots: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const subpath = pathname.startsWith(`/bots/${botId}`) ? pathname.slice(`/bots/${botId}`.length) : "";
  const currentBot = bots.find((bot) => bot.id === botId);

  return (
    <div className="flex h-row items-center justify-between border-b border-border">
      {/* Visually the switcher trigger carries the bot's name; this gives
          the page a real heading for assistive tech without duplicating
          the name a second time on screen. */}
      <h1 className="sr-only">{currentBot?.name ?? "Bot"}</h1>
      <Select value={botId} onValueChange={(newBotId) => router.push(`/bots/${newBotId}${subpath}`)}>
        <SelectTrigger size="sm" className="w-56 border-none bg-transparent px-1 text-base font-semibold shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {bots.map((bot) => (
            <SelectItem key={bot.id} value={bot.id}>
              {bot.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <nav className="flex items-center gap-4">
        {NAV_ITEMS.map((item) => {
          const href = `/bots/${botId}${item.subpath}`;
          const isActive = pathname === href;
          return (
            <Link
              key={item.subpath}
              href={href}
              className={cn(
                "text-sm font-medium text-muted-foreground hover:text-foreground",
                isActive && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
