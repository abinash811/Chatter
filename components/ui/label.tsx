import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label className={cn("text-sm font-medium", className)} ref={ref} {...props} />
  ),
);
Label.displayName = "Label";
