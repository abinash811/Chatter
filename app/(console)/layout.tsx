// Console shell — Linear register (docs/architecture.md §7): dense,
// minimal chrome, one fixed nav, no per-screen layout variation.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 shrink-0 border-r border-border px-3 py-4">
        <div className="px-2 py-2 text-sm font-semibold">Chatter</div>
        <ul className="mt-2 space-y-0.5">
          <li>
            <a
              href="/bots"
              className="flex h-row-sm items-center rounded px-2 text-sm hover:bg-muted"
            >
              Bots
            </a>
          </li>
        </ul>
      </nav>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
