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
        "soft-background": "hsl(var(--soft-background))",
        "muted-background": "hsl(var(--muted-background))",
        "strong-background": "hsl(var(--strong-background))",
        muted: "hsl(var(--muted))",
        foreground: "hsl(var(--foreground))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        "soft-foreground": "hsl(var(--soft-foreground))",
        "disabled-foreground": "hsl(var(--disabled-foreground))",
        "placeholder-foreground": "hsl(var(--placeholder-foreground))",
        "inverse-foreground": "hsl(var(--inverse-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        warning: "hsl(var(--warning))",
        "warning-foreground": "hsl(var(--warning-foreground))",
        alert: "hsl(var(--alert))",
        "alert-foreground": "hsl(var(--alert-foreground))",
        border: "hsl(var(--border))",
        "soft-border": "hsl(var(--soft-border))",
        "strong-border": "hsl(var(--strong-border))",
        "stronger-border": "hsl(var(--stronger-border))",
        "inverse-border": "hsl(var(--inverse-border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: "hsl(var(--sidebar))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "sidebar-primary": "hsl(var(--sidebar-primary))",
        "sidebar-primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        "sidebar-accent": "hsl(var(--sidebar-accent))",
        "sidebar-accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        "sidebar-border": "hsl(var(--sidebar-border))",
        "sidebar-ring": "hsl(var(--sidebar-ring))",
        panel: "hsl(var(--panel))",
        "panel-foreground": "hsl(var(--panel-foreground))",
        // Full numbered scale (CARE's exact emerald values, via
        // tailwindcss/colors) plus DEFAULT/foreground pointing at our
        // --accent pair — CARE's registry components reference both
        // the bare `bg-primary`/`text-primary-foreground` (their
        // semantic, theme-swapping pair) and the numbered steps
        // directly (`primary-100`, `primary-900`, for hover/active
        // shades). Without DEFAULT, `bg-primary` silently resolves to
        // nothing (found via a real screenshot — the Log In button
        // rendered unstyled).
        "primary-foreground": "hsl(var(--accent-foreground))",
        primary: {
          DEFAULT: "hsl(var(--accent))",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
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
