import type { Config } from "tailwindcss";

// Structural layer only — colors/spacing/type come from CSS custom
// properties in app/globals.css (docs/architecture.md §7's token split:
// structure here, theme in one place). Never hardcode a color in a
// component; reference a token.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        panel: "hsl(var(--panel))",
        "panel-foreground": "hsl(var(--panel-foreground))",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      // Type scale, finalized in ADR 0007 — six named steps, nothing
      // arbitrary in between. "micro" is a deliberate recurring role
      // (uppercase eyebrow labels), not a one-off.
      fontSize: {
        micro: ["0.625rem", { lineHeight: "1rem" }], // 10px
      },
      // Linear-register consistency: two row heights, used everywhere,
      // not one-off per screen (docs/architecture.md §7).
      spacing: {
        row: "2.5rem", // 40px — list/table rows
        "row-sm": "2rem", // 32px — dense rows (form fields, compact lists)
      },
    },
  },
  plugins: [],
} satisfies Config;
