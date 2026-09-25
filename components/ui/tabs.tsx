"use client";

/**
 * @name tabs
 * @description A set of layered sections of content—known as tab panels—that are displayed one at a time.
 * @dependencies @base-ui/react class-variance-authority
 * @type registry:ui
 */
// PATCHED (not a hand style edit — a correctness fix, ADR 0008's "never
// modify these files" exception is for style preference, not bugs):
// this file's own upstream source (care_fe/careui) used bare
// `data-horizontal:`/`data-vertical:` Tailwind classes, a real bug in
// their source, not a version drift on our side — verified
// `@base-ui/react` (1.8.0 here, 1.6.0 in their own lockfile) only ever
// sets `data-orientation="horizontal"|"vertical"` on Tabs.Root/Tab/
// List, never a bare `data-horizontal`/`data-vertical` boolean
// attribute, so Tailwind's bare `data-horizontal:` shorthand (which
// checks for attribute *presence*, confirmed in the compiled CSS
// output: `.data-horizontal\:h-0[data-horizontal]`) could never match.
// Rewritten below to `data-[orientation=horizontal]:` etc., which
// checks the attribute's actual value. Caught because the tabs
// rendered as an unstyled vertical stack instead of a horizontal bar —
// a real screenshot, not a guess.
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col has-data-[variant=browser]:gap-0",
        className
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-0.5 text-muted-foreground group-data-[orientation=horizontal]/tabs:h-12 md:group-data-[orientation=horizontal]/tabs:h-10 group-data-[orientation=vertical]/tabs:h-fit md:group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted ring-3 ring-border",
        line: "rounded-none gap-1 bg-transparent justify-start",
        browser:
          "rounded-none p-0 border-b border-border gap-1 items-end bg-transparent w-full justify-start group-data-[orientation=horizontal]/tabs:h-auto md:group-data-[orientation=horizontal]/tabs:h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "text-foreground/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:group-data-[variant=default]/tabs-list:shadow-xs data-active:group-data-[variant=line]/tabs-list:shadow-none md:px-2 md:has-data-[icon=inline-end]:pr-1.5 md:has-data-[icon=inline-start]:pl-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:bg-transparent data-active:group-data-[variant=line]/tabs-list:bg-transparent dark:data-active:group-data-[variant=line]/tabs-list:border-transparent dark:data-active:group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=browser]/tabs-list:border-border/60 group-data-[variant=browser]/tabs-list:bg-muted/50 data-active:group-data-[variant=browser]/tabs-list:bg-background data-active:group-data-[variant=browser]/tabs-list:border-border data-active:group-data-[variant=browser]/tabs-list:text-foreground group-data-[variant=browser]/tabs-list:-mb-px group-data-[variant=browser]/tabs-list:h-auto group-data-[variant=browser]/tabs-list:flex-none group-data-[variant=browser]/tabs-list:rounded-t-lg group-data-[variant=browser]/tabs-list:rounded-b-none group-data-[variant=browser]/tabs-list:border group-data-[variant=browser]/tabs-list:shadow-[inset_0_-1px_4px_rgba(0,0,0,0.06)] group-data-[variant=browser]/tabs-list:after:hidden data-active:group-data-[variant=browser]/tabs-list:border-b-transparent data-active:group-data-[variant=browser]/tabs-list:shadow-none dark:group-data-[variant=browser]/tabs-list:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.2)]",
        "data-active:bg-background data-active:text-primary-900 dark:data-active:group-data-[variant=default]/tabs-list:border-input dark:data-active:group-data-[variant=default]/tabs-list:bg-input/30 dark:data-active:group-data-[variant=default]/tabs-list:text-primary-400 dark:data-active:group-data-[variant=line]/tabs-list:text-primary-400",
        "after:bg-primary after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1 group-data-[orientation=horizontal]/tabs:after:h-1 group-data-[orientation=horizontal]/tabs:after:rounded-t-lg group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 data-active:group-data-[variant=line]/tabs-list:after:opacity-100",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "group-has-data-[variant=browser]/tabs:bg-background flex-1 text-sm outline-hidden group-has-data-[variant=browser]/tabs:rounded-tr-none group-has-data-[variant=browser]/tabs:border-t-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
