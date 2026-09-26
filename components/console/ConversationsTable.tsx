"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

interface ConversationRow {
  id: string;
  botName: string;
  createdAt: Date;
  messageCount: number;
  lastMessagePreview: string | null;
  hasIssue: boolean;
}

// Same Linear-register Table pattern as BotsTable (docs/design/
// principles.md #4 names "inbox" explicitly as a Linear surface):
// whole row navigates, client component only for the row-click handler.
export function ConversationsTable({ conversations }: { conversations: ConversationRow[] }) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bot</TableHead>
          <TableHead>Last message</TableHead>
          <TableHead>Messages</TableHead>
          <TableHead>Issues</TableHead>
          <TableHead className="text-right">Started</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {conversations.map((conversation) => (
          <TableRow
            key={conversation.id}
            className="h-row cursor-pointer"
            onClick={() => router.push(`/conversations/${conversation.id}`)}
          >
            <TableCell className="font-medium">{conversation.botName}</TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">
              {conversation.lastMessagePreview ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">{conversation.messageCount}</TableCell>
            <TableCell>
              {conversation.hasIssue ? (
                <Badge variant="destructive">Issue</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {relativeTime(conversation.createdAt)}
            </TableCell>
            <TableCell>
              <ChevronRight className="h-4 w-4 text-border" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
