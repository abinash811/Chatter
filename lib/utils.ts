import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn/ui helper — merges Tailwind classes without
// specificity conflicts. Used by every component in components/ui/.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Small and local on purpose — one use case (list-row timestamps)
// doesn't justify a date library dependency.
export function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Small and local for the same reason as relativeTime — one use case
// (the knowledge base's total-size indicator) doesn't justify a library.
// "Sep 28, 2026, 10:13 AM" — matches Chatbase's own Details panel date
// format (confirmed from the user's own screenshot). Client-only by
// convention (called from "use client" components) since
// Intl.DateTimeFormat's output can vary by the runtime's locale/TZ —
// safe here since it never runs during server rendering.
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Per-item visual distinction, staying inside ADR 0014/0017's monochrome
// system (2026-10-03 design pass) — a deterministic hash of a stable id
// (e.g. a bot's uuid) into one of 4 neutral-scale steps, for list-row
// avatar chips. Only primary-100..400 are offered: primary-50 is nearly
// indistinguishable from the page's white background, and primary-500
// fails WCAG AA (4.43:1) for black text on top — both confirmed via a
// real browser contrast check (canvas pixel readback), not computed by
// hand. 100-400 all clear 4.5:1 with margin (16.67:1 down to 8.13:1).
const AVATAR_CHIP_SHADES = ["bg-primary-100", "bg-primary-200", "bg-primary-300", "bg-primary-400"] as const;

export function hashToAvatarShade(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_CHIP_SHADES[hash % AVATAR_CHIP_SHADES.length];
}
