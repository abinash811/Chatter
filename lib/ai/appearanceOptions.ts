// Pure data, zero imports — deliberately its own module so a client
// component (BotEditorForm.tsx) can import these option lists without
// pulling in botConfig.ts's server-only deps (lib/db.ts's PrismaClient)
// into the browser bundle. botConfig.ts re-exports these for server-side
// callers so there's still one source of truth.

// Curated, not freeform — an emoji-as-avatar picker needs no new
// infrastructure (no image upload/storage, which doesn't exist anywhere
// in this app yet and would be its own ADR-worthy vendor choice). Real
// image-upload avatars are a known, explicitly deferred gap — see
// docs/roadmap.md.
export const AVATAR_EMOJI_OPTIONS = ["💬", "🤖", "🙂", "👋", "✨", "🛟", "🏬", "💡"] as const;
export type AvatarEmoji = (typeof AVATAR_EMOJI_OPTIONS)[number];

export const WIDGET_POSITIONS = ["bottom-right", "bottom-left"] as const;
export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];
