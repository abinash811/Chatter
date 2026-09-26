"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MessageCircle, Bot as BotIcon, Inbox, Settings, LogOut, Check, Circle } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  Avatar,
  AvatarFallback,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
} from "@/components/ui";
import { logoutAction } from "@/app/(console)/actions";

// Real CARE Sidebar (components/ui/sidebar.tsx, ADR 0008, now on shadcn's
// official source per ADR 0017) — icon-collapsible, not a hand-rolled
// <nav>. Nav items live here, not in layout.tsx, since usePathname()'s
// active-state needs a client boundary; the auth check and the
// server-fetched org/user/checklist data stay server-side in the layout.
const NAV_ITEMS = [
  { href: "/bots", label: "Bots", icon: BotIcon },
  { href: "/conversations", label: "Conversations", icon: Inbox },
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
}: {
  orgName: string;
  userEmail: string;
  gettingStartedSteps: GettingStartedStep[];
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const visibleItems = query.trim()
    ? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : NAV_ITEMS;

  const completedCount = gettingStartedSteps.filter((step) => step.done).length;
  const totalSteps = gettingStartedSteps.length;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* data-testid on the whole row, not just the text — its rendered
            width tracks the org name's length, which would otherwise make
            a visual-regression mask (tests/visual/console.visual.spec.ts)
            a different size on every run and never actually stabilize. */}
        <div data-testid="sidebar-org-name" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent">
            <MessageCircle className="h-3.5 w-3.5 text-accent-foreground" />
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

function GettingStartedWidget({
  steps,
  completedCount,
  totalSteps,
}: {
  steps: GettingStartedStep[];
  completedCount: number;
  totalSteps: number;
}) {
  if (completedCount === totalSteps) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full flex-col items-start gap-1.5 bg-card px-2.5 py-2 text-left font-normal group-data-[collapsible=icon]:hidden"
        >
          <span className="text-xs font-medium">
            Getting started
            <span className="ml-1.5 text-muted-foreground">
              {completedCount}/{totalSteps} completed
            </span>
          </span>
          <span className="flex w-full gap-1">
            {steps.map((step, i) => (
              <span
                key={i}
                className={step.done ? "h-1 flex-1 rounded-full bg-primary" : "h-1 flex-1 rounded-full bg-muted"}
              />
            ))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-64 p-2">
        <div className="flex flex-col">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-soft-background"
            >
              {step.done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
