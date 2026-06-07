import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[#dddddd] bg-white px-2.5 py-1 text-xs font-semibold text-[#222222]",
        className,
      )}
      {...props}
    />
  );
}
