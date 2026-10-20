"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Button,
} from "@/components/ui";
import { ConversationThread } from "./ConversationThread";
import { relativeTime, formatDateTime } from "@/lib/utils";
import { toggleConversationPauseAction, type ConversationActionState } from "@/app/(console)/conversations/actions";
import type { ConversationDetail } from "@/lib/conversations";

const idleState: ConversationActionState = { status: "idle", message: null };

const SOURCE_LABEL: Record<string, string> = { widget: "Widget", playground: "Playground" };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

// The right pane of ADR 0027's split view — a Chat/Details tab switch,
// matching Chatbase's own Playground panel. Sentiment/Country are
// honest "Not analyzed"/"Not tracked" states, not fabricated values
// (guardrail #4, and the user's own "don't guess" instruction) — see
// ADR 0027's Alternatives section for why those weren't built this pass.
export function ConversationDetailPanel({ conversation }: { conversation: ConversationDetail | null }) {
  const [state, formAction, isPending] = useActionState(
    conversation ? toggleConversationPauseAction.bind(null, conversation.botId, conversation.id) : async () => idleState,
    idleState,
  );

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Select a conversation</p>
        <p className="text-sm text-muted-foreground">Choose one from the list to see its messages.</p>
      </div>
    );
  }

  const isPaused = conversation.status === "paused";

  return (
    <Tabs defaultValue="chat" className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 pt-3">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <form action={formAction}>
          <input type="hidden" name="paused" value={String(!isPaused)} />
          <Button type="submit" variant="outline" size="sm" disabled={isPending}>
            {isPaused ? "Resume" : "Pause"}
          </Button>
        </form>
      </div>

      <TabsContent value="chat" className="flex-1 overflow-y-auto p-4">
        <ConversationThread messages={conversation.messages} toolCalls={conversation.toolCalls} />
      </TabsContent>

      <TabsContent value="details" className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">General details</p>
        <div>
          <DetailRow label="Contact">
            {conversation.contact ?? <span className="italic text-muted-foreground">Anonymous</span>}
          </DetailRow>
          <DetailRow label="Source">{SOURCE_LABEL[conversation.source] ?? conversation.source}</DetailRow>
          <DetailRow label="Status">
            <Badge variant={isPaused ? "muted" : "success"}>{isPaused ? "Paused" : "Ongoing"}</Badge>
          </DetailRow>
          <DetailRow label="Sentiment">
            <span className="italic text-muted-foreground">Not analyzed</span>
          </DetailRow>
          <DetailRow label="Messages">{conversation.messages.length}</DetailRow>
          <DetailRow label="Country">
            <span className="italic text-muted-foreground">Not tracked</span>
          </DetailRow>
          <DetailRow label="Created">{formatDateTime(conversation.createdAt)}</DetailRow>
          <DetailRow label="Last activity">
            {conversation.lastActivityAt ? relativeTime(conversation.lastActivityAt) : "—"}
          </DetailRow>
          <DetailRow label="Conversation ID">
            <span className="font-mono text-xs font-normal text-muted-foreground">{conversation.id}</span>
          </DetailRow>
        </div>
      </TabsContent>
    </Tabs>
  );
}
