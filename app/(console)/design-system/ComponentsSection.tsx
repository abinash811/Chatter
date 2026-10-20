import { FormControlsSection } from "./FormControlsSection";
import { ButtonsAndBadgesSection } from "./ButtonsAndBadgesSection";
import { OverlaysSection } from "./OverlaysSection";
import { DisplaySection } from "./DisplaySection";
import { NavigationSection } from "./NavigationSection";

// Every primitive in scripts/shadcn-manifest.json (26), rendered via
// the real imported component — not described. scripts/check-design-
// system-page-coverage.mjs fails if a manifested primitive is ever
// added without a reference here.
export function ComponentsSection() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Buttons &amp; badges</h2>
        <div className="mt-4">
          <ButtonsAndBadgesSection />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Form controls</h2>
        <div className="mt-4">
          <FormControlsSection />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Overlays</h2>
        <p className="mt-1 text-sm text-muted-foreground">Click any trigger — these are the real components, not screenshots.</p>
        <div className="mt-4">
          <OverlaysSection />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Display</h2>
        <div className="mt-4">
          <DisplaySection />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Navigation &amp; feedback</h2>
        <div className="mt-4">
          <NavigationSection />
        </div>
      </section>
    </div>
  );
}
