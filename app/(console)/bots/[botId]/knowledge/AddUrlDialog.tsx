"use client";

import { useState } from "react";
import type { KnowledgeActionState } from "./actions";
import {
  Button,
  Input,
  Label,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui";

export function AddUrlDialog({
  open,
  onOpenChange,
  formAction,
  state,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formAction: (formData: FormData) => void;
  state: KnowledgeActionState;
  isPending: boolean;
}) {
  const [crawl, setCrawl] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a URL</DialogTitle>
          <DialogDescription>
            A single page's article content by default. We'll pull the readable text and skip the navigation
            and footer clutter.
          </DialogDescription>
        </DialogHeader>
        <form id="add-url-form" action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://example.com/returns-policy"
              defaultValue={state.url ?? ""}
              className="mt-1"
              required
            />
          </div>
          <div className="rounded-md border border-border p-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox name="crawl" checked={crawl} onCheckedChange={(checked) => setCrawl(checked === true)} />
              Crawl this site instead of just this page
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {crawl
                ? `We'll follow this site's own sitemap (or its public links if it has none), up to 20 pages, and skip anything its robots.txt marks off-limits.`
                : `Leave this off to add just the one page above.`}
            </p>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="add-url-form" disabled={isPending}>
            {isPending ? (crawl ? "Crawling..." : "Adding...") : crawl ? "Crawl site" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
