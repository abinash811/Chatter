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

// Suggested-reply chip buttons (2026-09-27) — shown under the widget's
// greeting so a first-time visitor has something to tap instead of a
// blank input, matching Chatbase's own reference UI (confirmed from
// real screenshots, docs/research/competitive-landscape.md). A fixed
// max, not a freeform list — same reasoning as custom actions' fixed
// field rows (app/(console)/bots/[botId]/actions/actions.ts): a small,
// always-rendered set of rows is simpler to build and to use than a
// dynamic add/remove list, for a feature that's inherently "at most a
// few short buttons."
export const MAX_SUGGESTED_REPLIES = 3;
