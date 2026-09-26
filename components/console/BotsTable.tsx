"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@/components/ui";
import { relativeTime } from "@/lib/utils";

interface BotRow {
  id: string;
  name: string;
  createdAt: Date;
  published: boolean;
}

// Real CARE Table (components/ui/table.tsx, ADR 0008) replacing the
// hand-rolled div-list. Whole row navigates, not just the name cell —
// matches the prior list's click affordance and Linear's own table
// behavior (docs/architecture.md §7's register mapping). A client
// component only for that row-click handler; everything else about
// this page stays server-rendered.
//
// Depth/polish pass (principles.md #5/#9, 2026-09-26 rollout to this
// screen): a plain `onClick` on a `<tr>` looks fine but isn't actually
// keyboard-reachable — principle #8 is "no exceptions," and this was
// one. `tabIndex`/`role="link"`/`onKeyDown` plus a real focus ring
// fixes that for real, not just visually — verified with a real
// Tab+Enter keyboard-only navigation, not just a screenshot. Also
// caught a real, separate bug in the process: `ring-accent` (what
// Input/Textarea/Checkbox all used) is near-invisible on white —
// ADR 0014's token swap redefined `--accent` as a pale neutral-100
// background tint, not a ring color. `ring-ring` (shadcn's own real
// convention, matching Button's `focus-visible:ring-ring/50`) is
// fixed here and in those 3 primitives in the same pass.
export function BotsTable({ bots }: { bots: BotRow[] }) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Created</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bots.map((bot) => (
          <TableRow
            key={bot.id}
            className="group h-row cursor-pointer outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            role="link"
            tabIndex={0}
            aria-label={`Open ${bot.name}`}
            onClick={() => router.push(`/bots/${bot.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/bots/${bot.id}`);
              }
            }}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                {/* text-foreground, not text-accent — same near-invisible-
                    text bug as AuthShell's eyebrow label (--accent is a
                    pale background tint post-ADR-0014, not a text color). */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-semibold text-foreground shadow-xs transition-shadow group-hover:shadow-sm">
                  {bot.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium">{bot.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={bot.published ? "default" : "muted"}>
                {bot.published ? "Published" : "Draft only"}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">{relativeTime(bot.createdAt)}</TableCell>
            <TableCell>
              <ChevronRight className="h-4 w-4 text-border transition-colors group-hover:text-muted-foreground" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

