"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  MessageCircle,
  Bot as BotIcon,
  Inbox,
  Settings,
  LogOut,
  Pencil,
  Database,
  Users,
  Webhook,
  FormInput,
  ShieldCheck,
  Plug,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  Avatar,
  AvatarFallback,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { logoutAction } from "@/app/(console)/actions";
import { GettingStartedWidget } from "./GettingStartedWidget";

// ADR 0037: every bot-scoped page, in the order they appear in this
// sub-nav. Icons reused verbatim from each page's own EmptyState (not
// invented fresh) — Webhook/FormInput/Database already mean exactly
// this elsewhere in the app. Label says "Data sources," not
// "Knowledge" — the old BotTopBar nav still said "Knowledge," stale
// since the 2026-09-29 page rename.
// ADR 0038 (2026-10-04): Leads/Approvals/Integrations moved OUT of this
// sub-nav into the global NAV_ITEMS below — they're org-wide concepts
// (a lead/review-queue item/Shopify connection isn't scoped to one
// bot), not per-bot pages. Only the 4 genuinely per-bot pages stay here.
const BOT_NAV_ITEMS = [
  { subpath: "", label: "Editor", icon: Pencil },
  { subpath: "/knowledge", label: "Data sources", icon: Database },
  { subpath: "/actions", label: "Actions", icon: Webhook },
  { subpath: "/widgets", label: "Widgets", icon: FormInput },
];

// Real CARE Sidebar (components/ui/sidebar.tsx, ADR 0008, now on shadcn's
// official source per ADR 0017) — icon-collapsible, not a hand-rolled
// <nav>. Nav items live here, not in layout.tsx, since usePathname()'s
// active-state needs a client boundary; the auth check and the
// server-fetched org/user/checklist data stay server-side in the layout.
// Leads/Approvals/Integrations added 2026-10-04 (ADR 0038) — previously
// nested under a specific bot, moved here once they turned out to be
// org-wide concepts, not per-bot ones.
const NAV_ITEMS = [
  { href: "/bots", label: "Bots", icon: BotIcon },
  { href: "/conversations", label: "Conversations", icon: Inbox },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export interface GettingStartedStep {
  label: string;
  done: boolean;
  href: string;
}

export function AppSidebar({
  orgName,
  userEmail,
  gettingStartedSteps,
  bots,
}: {
  orgName: string;
  userEmail: string;
  gettingStartedSteps: GettingStartedStep[];
  bots: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const visibleItems = query.trim()
    ? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : NAV_ITEMS;

  const completedCount = gettingStartedSteps.filter((step) => step.done).length;
  const totalSteps = gettingStartedSteps.length;

  // ADR 0037 — only render the bot sub-nav while actually inside a bot
  // (route starts with /bots/<id>, and that id is real, not a stray
  // "/bots/new" or similar future route).
  const botMatch = pathname.match(/^\/bots\/([^/]+)/);
  const activeBotId = botMatch?.[1];
  const activeBot = bots.find((bot) => bot.id === activeBotId);
  const botSubpath =
    activeBot && pathname.startsWith(`/bots/${activeBot.id}`) ? pathname.slice(`/bots/${activeBot.id}`.length) : "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* data-testid on the whole row, not just the text — its rendered
            width tracks the org name's length, which would otherwise make
            a visual-regression mask (tests/visual/console.visual.spec.ts)
            a different size on every run and never actually stabilize. */}
        <div data-testid="sidebar-org-name" className="flex items-center gap-2 px-2 py-2">
          {/* bg-primary, not bg-accent — same near-invisible-tint bug as
              Badge's default variant: at the time this was written
              --accent was oklch(97%), sitting almost on top of
              --sidebar (oklch(98.5%)), a 1.5% lightness gap that read
              as no chip at all against the sidebar background (since
              darkened to 92.2%, 2026-10-02 — still bg-primary here for
              the real branded-chip look, not just contrast). Every
              visual-regression baseline masks this exact element (its
              testid), which is exactly why nobody caught it until a
              real screenshot was checked by hand. */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
            <MessageCircle className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">{orgName}</span>
        </div>
        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            placeholder="Search..."
            className="pl-7"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {activeBot && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              {/* A real combobox, not a plain label — reuses the exact
                  switcher BotTopBar used to render, just relocated.
                  Switching preserves the current subpath (ADR 0037,
                  same behavior as the old BotTopBar). */}
              <SidebarGroupLabel asChild className="h-auto group-data-[collapsible=icon]:hidden">
                <Select
                  value={activeBot.id}
                  onValueChange={(newBotId) => router.push(`/bots/${newBotId}${botSubpath}`)}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label={`Switch bot (currently ${activeBot.name})`}
                    className="w-full border-none bg-transparent px-2 text-xs font-medium text-sidebar-foreground/70 shadow-none"
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
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {BOT_NAV_ITEMS.map((item) => {
                    const href = `/bots/${activeBot.id}${item.subpath}`;
                    return (
                      <SidebarMenuItem key={item.subpath}>
                        <SidebarMenuButton asChild isActive={pathname === href} tooltip={item.label}>
                          <Link href={href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <GettingStartedWidget steps={gettingStartedSteps} completedCount={completedCount} totalSteps={totalSteps} />
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              data-testid="sidebar-user-email"
              className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Avatar size="sm">
                <AvatarFallback>{userEmail.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                {userEmail}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logoutAction}>
              <SidebarMenuButton type="submit" tooltip="Log out">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
