// Renders a token swatch using the *real* Tailwind utility class
// (bg-primary, text-primary-foreground, etc.) — the same classes every
// other screen in this app uses, not a copied hex value. Zero drift by
// construction: if a token's value in app/globals.css changes, this
// page's rendered color changes with it, automatically.
export function Swatch({
  bg,
  fg,
  name,
  border,
}: {
  bg: string;
  fg?: string;
  name: string;
  /** true = border-border (the common case); a string overrides it (e.g. "border-2 border-ring"). */
  border?: boolean | string;
}) {
  const borderClass = border === true ? "border border-border" : border || "";
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex h-14 items-center justify-center rounded-md text-xs ${bg} ${fg ?? "text-foreground"} ${borderClass}`}>
        Aa
      </div>
      <p className="truncate text-xs text-muted-foreground" title={name}>
        {name}
      </p>
    </div>
  );
}
