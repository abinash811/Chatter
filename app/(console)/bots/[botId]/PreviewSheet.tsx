"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { sendPreviewMessageAction, type PreviewMessageState } from "./actions";
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui";

const idleState: PreviewMessageState = { status: "idle", message: null };

interface PreviewMessage {
  role: "user" | "assistant";
  content: string;
}

// "Test your bot" (2026-09-27) — a slide-over chat, not a permanently
// docked pane like the reference product's own split-screen preview
// (docs/research/competitive-landscape.md's screenshots): a Sheet keeps
// this additive to the existing editor layout (max-w-2xl single column)
// instead of restructuring every tab into a two-pane layout for one
// feature. Talks to the real chat loop (sendPreviewMessageAction ->
// lib/ai/chat.ts's sendMessage) — same engine a real visitor gets, not
// a mocked reply.
export function PreviewSheet({ botId, published }: { botId: string; published: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [inputValue, setInputValue] = useState("");
  const [state, formAction, isPending] = useActionState(sendPreviewMessageAction.bind(null, botId), idleState);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success" && state.reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: state.reply! }]);
      setConversationId(state.conversationId);
    }
  }, [state]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, state]);

  function handleSend() {
    const text = inputValue.trim();
    if (!text || isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInputValue("");
    const formData = new FormData();
    formData.set("message", text);
    if (conversationId) formData.set("conversationId", conversationId);
    formAction(formData);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="h-4 w-4" />
        Preview
      </Button>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Test your bot</SheetTitle>
          <SheetDescription>
            Chat with the published version, exactly as a visitor would see it.
          </SheetDescription>
        </SheetHeader>

        {!published ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium">Not published yet</p>
            <p className="text-sm text-muted-foreground">Publish this bot first, then come back to test it.</p>
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Send a message to see how your bot replies.</p>
              )}
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
                  }
                >
                  {message.content}
                </div>
              ))}
              {isPending && <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking...</div>}
            </div>

            {state.status === "error" && state.message && (
              <p className="border-t border-border px-4 py-2 text-sm text-destructive">{state.message}</p>
            )}

            <div className="flex items-center gap-2 border-t border-border p-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                aria-label="Message"
                disabled={isPending}
              />
              <Button type="button" size="sm" onClick={handleSend} disabled={isPending || !inputValue.trim()}>
                Send
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
