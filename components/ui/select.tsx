import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-[#dddddd] bg-white px-3 text-sm text-[#222222] shadow-sm outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#ff385c]/15 disabled:cursor-not-allowed disabled:bg-[#f7f7f7]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
