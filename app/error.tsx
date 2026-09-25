"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

// Next.js App Router convention: catches an unhandled error anywhere in
// this route segment's render tree instead of crashing to a blank page
// or Next's raw dev overlay. Plain language, no stack trace shown to the
// user — the real error is logged server-side for debugging.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page ran into a problem loading. It's not something you did — try again, and if it
        keeps happening, let us know.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
