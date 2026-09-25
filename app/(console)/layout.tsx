import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui";
import { AppSidebar } from "@/components/console/AppSidebar";

// Console shell — Linear register (docs/architecture.md §7): dense,
// minimal chrome, no per-screen layout variation. Auth check lives here
// once, not duplicated per page. Real CARE Sidebar (ADR 0008) replaces
// the hand-rolled <nav> — same collapse-state cookie CARE's own
// component reads/writes, so the expanded/collapsed choice survives a
// reload without a client-side flash.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  try {
    await getCurrentSession();
  } catch {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-row items-center border-b border-border px-4">
          <SidebarTrigger />
        </div>
        <main className="px-8 py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
