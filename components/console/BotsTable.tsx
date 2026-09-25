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
            className="h-row cursor-pointer"
            onClick={() => router.push(`/bots/${bot.id}`)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-semibold text-accent">
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
              <ChevronRight className="h-4 w-4 text-border" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

