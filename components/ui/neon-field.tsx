import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const neonFieldClassName =
  "min-h-14 rounded-2xl border-[1.5px] border-[#c038ff] bg-black/65 px-4 text-[14px] text-white shadow-[0_0_16px_#d042ff] outline-none placeholder:text-[#8a8377] focus-visible:border-[#d66aff] focus-visible:ring-0 [font-family:var(--font-nunito)]";

export function NeonInput({ className, ...props }: ComponentProps<"input">) {
  return <Input className={cn(neonFieldClassName, className)} {...props} />;
}

export function NeonTextarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        neonFieldClassName,
        "min-h-32 w-full resize-none py-3.5 leading-6",
        className,
      )}
      {...props}
    />
  );
}

export function NeonSelect({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(neonFieldClassName, "w-full appearance-none", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function NeonField({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <Label
          htmlFor={id}
          className="text-sm font-bold text-white [font-family:var(--font-noto-sans-jp)]"
        >
          {label}
        </Label>
        {hint ? <span className="text-[11px] text-white/45">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
