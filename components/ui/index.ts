// Single import path for every shared primitive — one place to look, one
// place to add the next one. Enforced by scripts/check-component-imports.mjs:
// app/ may only import from "@/components/ui", never a specific file
// inside it. See docs/conventions.md.
export { Button, type ButtonProps } from "./button";
export { Input } from "./input";
export { Badge } from "./badge";
