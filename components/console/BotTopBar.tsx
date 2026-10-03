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
  { subpath: "/leads", label: "Leads" },
  { subpath: "/actions", label: "Actions" },
  { subpath: "/widgets", label: "Widgets" },
  { subpath: "/approvals", label: "Approvals" },
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
        {/* aria-label, not just SelectValue's rendered text — a real
            axe-core scan (tests/e2e/accessibility.spec.ts) flagged this
            trigger as having no accessible name despite visible text
            being present in innerText/textContent; shadcn's
            line-clamp-1 + flex combo on the value span appears to
            confuse accessible-name computation. An explicit label is
            correct regardless of the exact cause. */}
        <SelectTrigger
          size="sm"
          aria-label={`Switch bot (currently ${currentBot?.name ?? "unknown"})`}
          className="w-56 border-none bg-transparent px-1 text-base font-semibold shadow-none"
        >
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
            // Sidebar/top bar depth/polish pass (2026-10-03): this nav
            // used to signal its active item by text color alone
            // (component-checklist.md item 4, color-independent state)
            // — the Persona/Guardrails/Tools/Appearance Tabs rendered
            // directly below it on the same screen already use a
            // stronger pill background, so this was weaker than its own
            // neighbor. A bottom-border underline (transparent at rest,
            // so switching tabs doesn't shift layout) is now a second,
            // non-color signal; aria-current carries the same state to
            // assistive tech. focus-visible:ring matches every other
            // custom nav/row element in the app (ConversationListPane,
            // BotTableRow) — this was the one real gap.
            <Link
              key={item.subpath}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "border-b-2 border-transparent py-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm",
                isActive && "border-foreground text-foreground",
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
