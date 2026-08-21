import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function NeonCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-[#b72dff]/80 bg-black/65 shadow-[0_0_18px_rgba(192,56,255,0.28),inset_0_0_22px_rgba(82,18,110,0.12)] backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
