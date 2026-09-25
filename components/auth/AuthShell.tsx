import { Check, MessageCircle } from "lucide-react";

const TRUST_ITEMS = [
  "Draft, test, publish — in minutes",
  "Every reply traceable, every tool logged",
  "Your data never crosses tenants",
];

// Split layout per docs/design/preview/auth.html — shared by /login and
// /signup, the only two pages that need this chrome. Panel is fixed-dark
// regardless of light/dark mode (bg-panel, not bg-foreground/background),
// same reasoning as app/globals.css's --panel comment.
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col overflow-hidden bg-panel p-8 md:flex">
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full border-[40px] border-accent/10" />
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full border-[28px] border-accent/[0.08]" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-accent">
            <MessageCircle className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-semibold text-panel-foreground">Chatter</span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center">
          <div className="mb-7">
            <h2 className="mb-2 text-lg font-bold leading-snug text-panel-foreground">
              One chat engine.
              <br />
              Every business.
            </h2>
            <p className="text-xs leading-relaxed text-panel-foreground/45">
              Ecommerce, healthcare, automotive — the same
              <br />
              Claude-powered core, your own guardrails.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-panel-foreground/55">
                <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-panel-foreground/[0.08]">
                  <Check className="h-2.5 w-2.5 text-panel-foreground/65" strokeWidth={2.5} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-lg border border-border p-7">
          <p className="mb-1 text-micro font-bold uppercase tracking-widest text-accent">{eyebrow}</p>
          <h1 className="mb-1 text-lg font-semibold">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
