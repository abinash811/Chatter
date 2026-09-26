"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Bot as BotIcon, Inbox, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui";
import { logoutAction } from "@/app/(console)/actions";

// Real CARE Sidebar (components/ui/sidebar.tsx, ADR 0008) — icon-collapsible,
// not the hand-rolled <nav> it replaces. Nav items live here, not in
// layout.tsx, since usePathname()'s active-state needs a client boundary;
// the auth check stays server-side in the layout.
const NAV_ITEMS = [
  { href: "/bots", label: "Bots", icon: BotIcon },
  { href: "/conversations", label: "Conversations", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent">
            <MessageCircle className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Chatter</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
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
        <SidebarMenu>
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
