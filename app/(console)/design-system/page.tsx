import { TokensSection } from "./TokensSection";

// A live reference page, not a markdown description of one — every
// swatch/example below renders the real app/globals.css tokens and
// real components/ui/ primitives, so it can't silently drift from
// what's actually shipped the way a hand-written doc can. User-
// requested (2026-10-08), scoped to 3 phases: Tokens (this one),
// Components, Page templates + registers. Reachable by direct URL,
// deliberately not in AppSidebar's main nav — this is a reference tool
// for whoever's building the console, not something a business owner
// needs in their daily nav. See docs/design/design-system.md for the
// prose version this page is gradually making redundant.
export default function DesignSystemPage() {
  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Design system</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The real tokens and components this console runs — not a description of them. If something here looks wrong,
        it's the token or component that's wrong, not this page.
      </p>
      <div className="mt-6">
        <TokensSection />
      </div>
    </div>
  );
}
