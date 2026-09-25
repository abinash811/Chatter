import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui";

// CARE (ohcnetwork/care_fe) uses Figtree via @fontsource's runtime CSS
// import — a Vite convention. next/font/google gets the same typeface
// self-hosted and build-time-optimized instead, which is the idiomatic
// way to do this in Next.js App Router (docs/research/current-practices.md).
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Chatter",
  description: "AI chat platform console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
