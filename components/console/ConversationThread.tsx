import { Badge } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface ThreadToolCall {
  id: string;
  toolName: string;
  input: unknown;
  output: string;
  createdAt: Date;
  isHandoff: boolean;
}

type TimelineEntry =
  | { kind: "message"; createdAt: Date; message: ThreadMessage }
  | { kind: "tool_call"; createdAt: Date; toolCall: ThreadToolCall };

function buildTimeline(messages: ThreadMessage[], toolCalls: ThreadToolCall[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...messages.map((message) => ({ kind: "message" as const, createdAt: message.createdAt, message })),
    ...toolCalls.map((toolCall) => ({ kind: "tool_call" as const, createdAt: toolCall.createdAt, toolCall })),
  ];
  return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// Guardrail #6 (traceability): tool calls render inline alongside the
// messages that surrounded them, not in a separate tab a reviewer has
// to cross-reference by timestamp — the point of logging them is to
// make a bad answer debuggable at a glance.
export function ConversationThread({
  messages,
  toolCalls,
}: {
  messages: ThreadMessage[];
  toolCalls: ThreadToolCall[];
}) {
  const timeline = buildTimeline(messages, toolCalls);

  return (
    <div className="space-y-3">
      {timeline.map((entry) =>
        entry.kind === "message" ? (
          <div
            key={entry.message.id}
            className={`flex flex-col gap-1 ${entry.message.role === "user" ? "items-start" : "items-end"}`}
          >
            <span className="text-xs text-muted-foreground">
              {entry.message.role === "user" ? "Visitor" : "Bot"} · {relativeTime(entry.message.createdAt)}
            </span>
            <div
              className={`max-w-lg rounded-lg px-3 py-2 text-sm ${
                entry.message.role === "user"
                  ? "bg-muted text-foreground"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {entry.message.content}
            </div>
          </div>
        ) : (
          <div key={entry.toolCall.id} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Tool call · {relativeTime(entry.toolCall.createdAt)}
              {entry.toolCall.isHandoff && (
                <Badge variant="destructive" className="ml-2">
                  Handoff
                </Badge>
              )}
            </span>
            <div className="rounded-lg border border-border bg-soft-background px-3 py-2 font-mono text-xs">
              <div className="font-semibold">{entry.toolCall.toolName}</div>
              <div className="mt-1 text-muted-foreground">in: {JSON.stringify(entry.toolCall.input)}</div>
              <div className="mt-1 text-muted-foreground">out: {entry.toolCall.output}</div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
