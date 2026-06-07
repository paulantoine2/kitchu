import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-[#dddddd] bg-white px-3 text-sm text-[#222222] shadow-sm outline-none transition placeholder:text-[#717171] focus:border-[#222222] focus:ring-2 focus:ring-[#ff385c]/15 disabled:cursor-not-allowed disabled:bg-[#f7f7f7]",
        className,
      )}
      {...props}
    />
  );
}
