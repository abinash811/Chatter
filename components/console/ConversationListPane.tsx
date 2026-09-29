"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Checkbox } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { ConversationListRow } from "@/lib/conversations";

// The left rail of ADR 0027's split-pane layout — a real <Link> per row
// (not a manual role="link"/tabIndex/onKeyDown pattern like the old
// ConversationsTable, since a plain anchor is keyboard-accessible for
// free and this is a single-column list, not a multi-column Table).
export function ConversationListPane({
  conversations,
  selectedId,
  bulkMode,
  selectedIds,
  onToggleSelected,
}: {
  conversations: ConversationListRow[];
  selectedId: string | null;
  bulkMode: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-14 text-center">
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="text-sm text-muted-foreground">
          Conversations started through a bot&apos;s widget will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul data-slot="conversation-list" className="flex-1 divide-y divide-border overflow-y-auto">
      {conversations.map((conversation) => (
        <li key={conversation.id} className="relative">
          {bulkMode && (
            <Checkbox
              checked={selectedIds.has(conversation.id)}
              onCheckedChange={() => onToggleSelected(conversation.id)}
              aria-label={`Select conversation with ${conversation.botName}`}
              className="absolute left-3 top-3.5 z-10"
            />
          )}
          <Link
            href={`/conversations/${conversation.id}${query ? `?${query}` : ""}`}
            className={cn(
              "block px-3 py-3 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              bulkMode && "pl-10",
              conversation.id === selectedId && "bg-muted",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{conversation.botName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(conversation.createdAt)}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {conversation.lastMessagePreview ?? "—"}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {conversation.hasIssue && <Badge variant="destructive">Issue</Badge>}
              {conversation.status === "paused" && <Badge variant="muted">Paused</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
