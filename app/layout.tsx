import type { Metadata } from "next";
// Self-hosted variable font (ADR 0036) — no runtime/build-time network
// request, unlike next/font/google's fetch from Google's font CDN.
// Only the weight axis is pulled in (wght.css), matching every weight
// this app actually uses (400/500/600/700 via font-normal/medium/
// semibold/bold) — not opsz, which this app doesn't use.
import "@fontsource-variable/inter/wght.css";
import "./globals.css";
import { Toaster } from "@/components/ui";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const metadata: Metadata = {
  title: "Chatter",
  description: "AI chat platform console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
