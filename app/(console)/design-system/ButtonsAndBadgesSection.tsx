import { Button, Badge } from "@/components/ui";

const BUTTON_VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;
const BADGE_VARIANTS = ["default", "muted", "success", "warning", "alert", "destructive"] as const;

export function ButtonsAndBadgesSection() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium">
          Button variants{" "}
          <span className="text-xs font-normal text-muted-foreground">
            — solid black (<code className="text-xs">default</code>) is reserved for the one real CTA per screen
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
          <Button disabled>disabled</Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Button sizes</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {BUTTON_SIZES.map((s) => (
            <Button key={s} size={s}>
              Save
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">
          Badge variants{" "}
          <span className="text-xs font-normal text-muted-foreground">
            — status chips only, never a clickable action (2026-10-08)
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {BADGE_VARIANTS.map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Real usage: <code className="text-xs">success</code> = Published/Connected/Ongoing,{" "}
          <code className="text-xs">warning</code> = pending approval, <code className="text-xs">destructive</code> =
          Issue/failed, <code className="text-xs">muted</code> = Draft/Paused.{" "}
          <code className="text-xs">alert</code> has no real call site yet.
        </p>
      </div>
    </div>
  );
}
