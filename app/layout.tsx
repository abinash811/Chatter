import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui";

export const metadata: Metadata = {
  title: "Chatter",
  description: "AI chat platform console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
