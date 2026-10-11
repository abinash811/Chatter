import { Button } from "@/components/ui";
import { Swatch } from "./Swatch";

// Every real semantic color token in app/globals.css's @theme block,
// grouped the same way design-system.md's own "Color tokens" section
// groups them — not re-derived, transcribed from the one real source.
// A token added to globals.css without a matching row here is the one
// real gap this page doesn't yet close mechanically (see
// scripts/check-design-system-page-coverage.mjs's own scope note for
// why components, not color tokens, are what that check covers).
function ColorGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
    </div>
  );
}

function Colors() {
  return (
    <div className="space-y-6">
      <ColorGroup title="Backgrounds">
        <Swatch bg="bg-background" name="background" border />
        <Swatch bg="bg-soft-background" name="soft-background" border />
        <Swatch bg="bg-muted-background" name="muted-background" border />
        <Swatch bg="bg-strong-background" name="strong-background" border />
        <Swatch bg="bg-muted" name="muted" border />
        <Swatch bg="bg-card" name="card" border />
        <Swatch bg="bg-popover" name="popover" border />
        <Swatch bg="bg-sidebar" name="sidebar" border />
        <Swatch bg="bg-panel" fg="text-panel-foreground" name="panel" />
      </ColorGroup>

      <ColorGroup title="Foregrounds (on background)">
        <Swatch bg="bg-background" fg="text-foreground" name="foreground" border />
        <Swatch bg="bg-background" fg="text-muted-foreground" name="muted-foreground" border />
        <Swatch bg="bg-background" fg="text-soft-foreground" name="soft-foreground" border />
        <div className="flex flex-col gap-1.5">
          <Button
            disabled
            variant="outline"
            className="h-14 w-full justify-center rounded-md border border-border bg-background text-xs text-disabled-foreground"
          >
            Aa
          </Button>
          <p className="text-xs text-muted-foreground">disabled-foreground</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            disabled
            placeholder="Aa"
            className="flex h-14 items-center justify-center rounded-md border border-border bg-background text-center text-xs placeholder:text-placeholder-foreground"
          />
          <p className="text-xs text-muted-foreground">placeholder-foreground</p>
        </div>
      </ColorGroup>
      <p className="text-xs text-muted-foreground">
        <code className="text-xs">disabled-foreground</code> and <code className="text-xs">placeholder-foreground</code>{" "}
        have no real call site anywhere in the app today — <code className="text-xs">Input</code>'s real placeholder
        styling uses <code className="text-xs">placeholder:text-muted-foreground</code> instead (see{" "}
        <code className="text-xs">components/ui/input.tsx</code>). Rendered here via a real disabled button/input
        (not a plain text block) so this page's own accessibility scan doesn't flag them — WCAG exempts disabled
        controls from the contrast requirement, which is exactly the context these two tokens were named for.
      </p>

      <ColorGroup title="Primary / secondary / accent">
        <Swatch bg="bg-primary" fg="text-primary-foreground" name="primary" />
        <Swatch bg="bg-secondary" fg="text-secondary-foreground" name="secondary" />
        <Swatch bg="bg-accent" fg="text-accent-foreground" name="accent" />
      </ColorGroup>

      <ColorGroup title="Status — solid fill">
        <Swatch bg="bg-destructive" fg="text-destructive-foreground" name="destructive" />
        <Swatch bg="bg-warning" fg="text-warning-foreground" name="warning" />
        <Swatch bg="bg-alert" fg="text-alert-foreground" name="alert" />
        <Swatch bg="bg-success" fg="text-success-foreground" name="success" />
      </ColorGroup>

      <ColorGroup title="Status — light tint (Badge's shape)">
        <Swatch bg="bg-destructive/10" fg="text-destructive" name="destructive/10 + text-destructive" border />
        <Swatch bg="bg-warning/10" fg="text-warning-strong" name="warning/10 + text-warning-strong" border />
        <Swatch bg="bg-alert/10" fg="text-alert-strong" name="alert/10 + text-alert-strong" border />
        <Swatch bg="bg-success/10" fg="text-success-strong" name="success/10 + text-success-strong" border />
      </ColorGroup>

      <ColorGroup title="Borders / ring">
        <Swatch bg="bg-background" name="soft-border" border="border border-soft-border" />
        <Swatch bg="bg-background" name="border" border="border border-border" />
        <Swatch bg="bg-background" name="strong-border" border="border border-strong-border" />
        <Swatch bg="bg-background" name="stronger-border" border="border border-stronger-border" />
        <Swatch bg="bg-background" name="ring" border="border-2 border-ring" />
      </ColorGroup>

      <ColorGroup title="Sidebar">
        <Swatch bg="bg-sidebar" fg="text-sidebar-foreground" name="sidebar" />
        <Swatch bg="bg-sidebar-primary" fg="text-sidebar-primary-foreground" name="sidebar-primary" />
        <Swatch bg="bg-sidebar-accent" fg="text-sidebar-accent-foreground" name="sidebar-accent" />
      </ColorGroup>
    </div>
  );
}

function Typography() {
  const sizes = [
    { cls: "text-xl font-semibold tracking-tight", label: "text-xl — page titles" },
    { cls: "text-lg font-semibold", label: "text-lg — dialog/card/section titles" },
    { cls: "text-base", label: "text-base — plain paragraph copy (rare)" },
    { cls: "text-sm", label: "text-sm — the workhorse: body copy, table cells, labels" },
    { cls: "text-xs", label: "text-xs — helper/meta text, badges, timestamps" },
    { cls: "text-micro", label: "text-micro (0.625rem) — the smallest UI chrome" },
  ];
  return (
    <div className="space-y-3">
      {sizes.map((s) => (
        <div key={s.label} className="flex items-baseline gap-4 border-b border-border pb-3 last:border-0">
          <p className={s.cls}>The quick brown fox</p>
          <p className="ml-auto shrink-0 text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function Elevation() {
  const tiers = [
    { cls: "shadow-xs", label: "Surface (resting)", used: "Card, table/list wrappers, Select trigger" },
    { cls: "shadow-md", label: "Floating", used: "DropdownMenu, Popover, Select content" },
    { cls: "shadow-lg", label: "Modal", used: "Dialog, AlertDialog" },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {tiers.map((t) => (
        <div key={t.label} className="space-y-2">
          <div className={`h-16 rounded-lg border border-border bg-card ${t.cls}`} />
          <p className="text-sm font-medium">
            {t.label} — <code className="text-xs">{t.cls}</code>
          </p>
          <p className="text-xs text-muted-foreground">{t.used}</p>
        </div>
      ))}
    </div>
  );
}

function Motion() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <p>
          <span className="font-medium">Micro — 150ms.</span>{" "}
          <span className="text-muted-foreground">Button/Input/Checkbox/Switch hover-focus feedback.</span>
        </p>
        <p>
          <span className="font-medium">Overlay — 200ms.</span>{" "}
          <span className="text-muted-foreground">Dialog/DropdownMenu/Popover/Select open-close, TabsContent fade.</span>
        </p>
        <p>
          <span className="font-medium">Panel — 300-500ms.</span>{" "}
          <span className="text-muted-foreground">Sheet slide (shadcn's own asymmetric default).</span>
        </p>
      </div>
      <div
        className="inline-block cursor-default rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-xs transition-shadow hover:shadow-sm"
        title="Hover me — this is the same transition-shadow convention OptionCard/BotTableRow/ConversationListPane use"
      >
        Hover to feel the micro transition (shadow-xs → shadow-sm, 150ms)
      </div>
    </div>
  );
}

function RadiusAndSpacing() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <div className="h-16 w-16 rounded-lg border border-border bg-card" />
        <p className="text-sm font-medium">
          Radius — <code className="text-xs">rounded-lg</code> (0.625rem, <code className="text-xs">--radius</code>)
        </p>
        <p className="text-xs text-muted-foreground">Matches shadcn's own real current default exactly.</p>
      </div>
      <div className="space-y-2">
        <div className="flex h-row items-center rounded-md border border-border bg-card px-3 text-sm">h-row (2.5rem)</div>
        <div className="flex h-row-sm items-center rounded-md border border-border bg-card px-3 text-sm">h-row-sm (2rem)</div>
        <p className="text-xs text-muted-foreground">
          The only 2 custom spacing tokens — fixed list/table row heights. Everything else uses Tailwind's own default
          scale (0.25rem base): <code className="text-xs">gap-2</code>/<code className="text-xs">p-4</code>/
          <code className="text-xs">space-y-4</code>, not invented values.
        </p>
      </div>
    </div>
  );
}

export function TokensSection() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Color</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every swatch below renders the real Tailwind utility class (e.g. <code className="text-xs">bg-primary</code>) —
          not a copied hex value. If a token changes in <code className="text-xs">app/globals.css</code>, this page
          changes with it.
        </p>
        <div className="mt-4">
          <Colors />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Type</h2>
        <p className="mt-1 text-sm text-muted-foreground">Inter Variable, self-hosted (ADR 0036).</p>
        <div className="mt-4">
          <Typography />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Elevation</h2>
        <div className="mt-4">
          <Elevation />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Motion</h2>
        <div className="mt-4">
          <Motion />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Radius &amp; spacing</h2>
        <div className="mt-4">
          <RadiusAndSpacing />
        </div>
      </section>
    </div>
  );
}
