import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

// Shared card shape for "a fixed set of typed options" screens — matches
// Chatbase's own reused pattern across their Actions/Data sources/
// Channels/Integrations pages (icon, title, one-line description, one
// action), confirmed from real screenshots (docs/research/competitive-
// landscape.md's 2026-09-27 update), not a per-screen one-off. First
// used by the bot editor's Tools tab and Knowledge's Add entry point.
export function OptionCard({
  icon: Icon,
  title,
  description,
  trailing,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** A small control in the card's top-right corner (e.g. an enable/disable Switch). */
  trailing?: React.ReactNode;
  /** A button (or row of buttons) below the description. */
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{title}</p>
            {trailing}
          </div>
          {/* line-clamp-2, not a full paragraph — a tool's `description`
              is written as an instruction for the model (verbose, can run
              to several sentences), not human-facing UI copy. Without a
              clamp, cards in the same grid vary wildly in height purely
              based on how long that instruction happens to be (caught via
              a real screenshot: collect_lead's card was nearly 2x
              check_order_status's). */}
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" title={description}>
            {description}
          </p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
