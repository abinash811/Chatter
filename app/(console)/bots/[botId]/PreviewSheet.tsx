"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { sendPreviewMessageAction, type PreviewMessageState } from "./actions";
import type { RenderWidgetPayload } from "@/lib/ai/tools/widget";
import {
  Button,
  Input,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui";

// ADR 0028 — the shape of a widget's JSON Schema this sheet knows how to
// render; loosely typed since a widget's fields are business-authored,
// not compile-time known.
interface WidgetSchemaProperty {
  type?: "string" | "number" | "boolean";
  title?: string;
  enum?: string[];
}
interface WidgetSchema {
  properties?: Record<string, WidgetSchemaProperty>;
  required?: string[];
}

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
  // ADR 0028 — the last widget triggered, if any, and the visitor's
  // in-progress answers before submitting.
  const [widget, setWidget] = useState<RenderWidgetPayload | undefined>();
  const [widgetValues, setWidgetValues] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (state.status === "success") {
      if (state.reply) setMessages((prev) => [...prev, { role: "assistant", content: state.reply! }]);
      setConversationId(state.conversationId);
      setWidget(state.widget);
      setWidgetValues({});
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

  // ADR 0028 — the visitor's filled-in widget answers are sent back as
  // their own next chat message, formatted plain-language, same as
  // public/widget.js's renderWidget does — no new endpoint.
  function handleWidgetSubmit(e: FormEvent) {
    e.preventDefault();
    if (!widget || isPending) return;
    const schema = widget.schema as WidgetSchema;
    const properties = schema.properties ?? {};
    const parts: string[] = [];
    Object.entries(properties).forEach(([name, prop]) => {
      const value = widgetValues[name];
      if (value === undefined || value === "" || value === false) return;
      parts.push(`${prop.title ?? name}: ${value}`);
    });
    const text = parts.join(", ");
    setWidget(undefined);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
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
              {widget && (
                <form
                  onSubmit={handleWidgetSubmit}
                  className="mr-auto flex max-w-[85%] flex-col gap-2 rounded-lg bg-muted p-3"
                >
                  {Object.entries((widget.schema as WidgetSchema).properties ?? {}).map(([name, prop]) => {
                    const required = ((widget.schema as WidgetSchema).required ?? []).includes(name);
                    const fieldId = `widget-field-${name}`;
                    if (prop.type === "boolean") {
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <Checkbox
                            id={fieldId}
                            checked={Boolean(widgetValues[name])}
                            onCheckedChange={(checked) => setWidgetValues((prev) => ({ ...prev, [name]: checked === true }))}
                          />
                          <Label htmlFor={fieldId} className="text-xs font-normal">
                            {prop.title ?? name}
                            {required && " *"}
                          </Label>
                        </div>
                      );
                    }
                    if (prop.enum) {
                      return (
                        <div key={name}>
                          <Label htmlFor={fieldId} className="text-xs">
                            {prop.title ?? name}
                            {required && " *"}
                          </Label>
                          <Select
                            value={String(widgetValues[name] ?? "")}
                            onValueChange={(value) => setWidgetValues((prev) => ({ ...prev, [name]: value }))}
                          >
                            <SelectTrigger id={fieldId} size="sm" className="mt-1">
                              <SelectValue placeholder="Choose one" />
                            </SelectTrigger>
                            <SelectContent>
                              {prop.enum.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }
                    return (
                      <div key={name}>
                        <Label htmlFor={fieldId} className="text-xs">
                          {prop.title ?? name}
                          {required && " *"}
                        </Label>
                        <Input
                          id={fieldId}
                          type={prop.type === "number" ? "number" : "text"}
                          required={required}
                          value={String(widgetValues[name] ?? "")}
                          onChange={(e) => setWidgetValues((prev) => ({ ...prev, [name]: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    );
                  })}
                  <Button type="submit" size="sm" disabled={isPending} className="self-start">
                    {widget.submitLabel}
                  </Button>
                </form>
              )}
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
