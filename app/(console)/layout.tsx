import { redirect } from "next/navigation";
import { MessageCircle, Bot as BotIcon } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";

// Console shell — Linear register (docs/architecture.md §7): dense,
// minimal chrome, one fixed nav, no per-screen layout variation. Auth
// check lives here once, not duplicated per page.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  try {
    await getCurrentSession();
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-56 shrink-0 border-r border-border px-3 py-4">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent">
            <MessageCircle className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-semibold">Chatter</span>
        </div>
        <ul className="mt-2 space-y-0.5">
          <li>
            <a
              href="/bots"
              className="flex h-row-sm items-center gap-2 rounded px-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <BotIcon className="h-4 w-4 text-muted-foreground" />
              Bots
            </a>
          </li>
        </ul>
      </nav>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
