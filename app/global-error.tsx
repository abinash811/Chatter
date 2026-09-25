"use client";

import { useEffect } from "react";

// Catches an error in the root layout itself (rarer than app/error.tsx's
// case) — must render its own <html>/<body> since it replaces the whole
// root layout when triggered. Inline styles, not Tailwind classes: if
// the root layout broke, don't assume anything else about the app's
// setup still works.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ maxWidth: "360px", fontSize: "14px", color: "#737373" }}>
            The app ran into a problem and couldn't load. Try again — if it keeps happening, let
            us know.
          </p>
          <button
            onClick={reset}
            style={{
              height: "36px",
              padding: "0 16px",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
