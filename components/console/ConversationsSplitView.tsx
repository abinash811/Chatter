"use client";

import { useState } from "react";
import { MoreHorizontal, Download } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import { ConversationFilters } from "./ConversationFilters";
import { ConversationListPane } from "./ConversationListPane";
import { ConversationDetailPanel } from "./ConversationDetailPanel";
import { buildCsv, downloadCsv } from "@/lib/csvExport";
import type { ConversationListRow, ConversationDetail } from "@/lib/conversations";

const CSV_HEADERS = ["Conversation ID", "Bot", "Status", "Source", "Messages", "Has issue", "Created"];

function toCsvRow(conversation: ConversationListRow): string[] {
  return [
    conversation.id,
    conversation.botName,
    conversation.status,
    conversation.source,
    String(conversation.messageCount),
    conversation.hasIssue ? "yes" : "no",
    conversation.createdAt.toISOString(),
  ];
}

// ADR 0027 — the split-pane orchestrator: filters + a "..." menu
// (Select/Export, matching Chatbase's own) on top, the list pane and
// the selected conversation's Chat/Details panel below. Bulk-select
// state is local UI state, not URL-persisted — a transient mode, same
// call as KnowledgeTable.tsx's bulk-select (ADR "Data sources
// rebuild").
export function ConversationsSplitView({
  bots,
  conversations,
  selectedConversation,
  selectedId,
}: {
  bots: { id: string; name: string }[];
  conversations: ConversationListRow[];
  selectedConversation: ConversationDetail | null;
  selectedId: string | null;
}) {
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportRows(rows: ConversationListRow[]) {
    const csv = buildCsv(CSV_HEADERS, rows.map(toCsvRow));
    downloadCsv(`conversations-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex h-row items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          Conversations{" "}
          {conversations.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">{conversations.length}</span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <ConversationFilters bots={bots} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setBulkMode((prev) => !prev);
                  setSelectedIds(new Set());
                }}
              >
                {bulkMode ? "Cancel select" : "Select"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportRows(conversations)}>
                <Download className="h-4 w-4" />
                Export all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {bulkMode && selectedIds.size > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
          <p className="text-sm text-muted-foreground">{selectedIds.size} selected</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportRows(conversations.filter((c) => selectedIds.has(c.id)))}
          >
            <Download className="h-4 w-4" />
            Export selected
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-1 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex w-80 shrink-0 flex-col border-r border-border">
          <ConversationListPane
            conversations={conversations}
            selectedId={selectedId}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
          />
        </div>
        <ConversationDetailPanel conversation={selectedConversation} />
      </div>
    </div>
  );
}
