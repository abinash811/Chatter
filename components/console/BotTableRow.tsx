"use client";

import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import {
  TableRow,
  TableCell,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import { relativeTime } from "@/lib/utils";
import type { BotRow } from "./BotsTable";

// Split out of BotsTable.tsx (scripts/check-file-length.mjs) — one
// row's worth of the table body, including its actions menu.
export function BotTableRow({
  bot,
  isDuplicating,
  onRename,
  onDuplicate,
  onArchive,
}: {
  bot: BotRow;
  isDuplicating: boolean;
  onRename: (bot: BotRow) => void;
  onDuplicate: (botId: string) => void;
  onArchive: (bot: BotRow) => void;
}) {
  const router = useRouter();

  return (
    <TableRow
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
          {/* bg-primary/10, not bg-accent/10 — the mockup's row-icon
              chip used a visibly tinted fill (its pre-monochrome
              emerald), not a plain gray smudge; at the time this was
              written --accent was oklch(97%) post-ADR-0014 (since
              darkened to 92.2%, 2026-10-02, for the same near-
              invisible-tint reason), so bg-accent/10 blended into the
              white row. text-foreground, not text-accent, for the same
              reason (--accent is a background tint, not a text color). */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-foreground shadow-xs transition-shadow group-hover:shadow-sm">
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
      <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
        {relativeTime(bot.createdAt)}
      </TableCell>
      <TableCell
        // Row-level onClick/onKeyDown navigate; this cell hosts its own
        // interactive menu, so both must be stopped here or opening the
        // menu (click, or Enter/Space while it has focus) also fires the
        // row's navigation underneath it.
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${bot.name}`}
              // Always visible below sm — hover-to-reveal has no
              // equivalent on a touch screen, so a narrow viewport
              // (this app's stand-in for "no real hover," same
              // threshold the Created column above uses) always shows
              // it instead of hiding a feature no gesture would surface.
              className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:data-[state=open]:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(bot)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isDuplicating}
              onSelect={() => onDuplicate(bot.id)}
            >
              {/* A silent disabled wait between click and redirect —
                  every other pending action on this screen (rename,
                  archive) says what's happening; this one didn't
                  (component-checklist.md item 1 audit, 2026-09-27). */}
              {isDuplicating ? "Duplicating..." : "Duplicate"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onArchive(bot)}
            >
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
