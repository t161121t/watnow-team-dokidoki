import type { ComponentProps } from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const neonButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full border font-bold [font-family:var(--font-noto-sans-jp)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55a8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "border-2 border-[#c038ff] bg-black/80 text-white shadow-[0_0_50px_rgba(138,43,226,0.32),0_0_16px_2px_rgba(192,56,255,0.72)] hover:bg-[#22052d] hover:shadow-[0_0_42px_rgba(138,43,226,0.48),0_0_20px_3px_rgba(192,56,255,0.82)]",
        secondary:
          "border-[#c038ff]/90 bg-[#16041e]/75 text-white shadow-[0_0_14px_rgba(192,56,255,0.42)] hover:bg-[#2a0738]",
        blue: "border-[#318cff] bg-black/80 text-white shadow-[0_0_15px_rgba(49,140,255,0.7)] hover:bg-[#041b38]",
        quiet:
          "border-white/20 bg-white/[0.06] text-white/90 hover:border-[#c038ff]/70 hover:bg-[#24062f]",
        danger:
          "border-[#ff4e86]/80 bg-[#21050e]/75 text-[#ffb4ca] shadow-[0_0_13px_rgba(255,37,108,0.32)] hover:bg-[#350816]",
      },
      size: {
        lg: "min-h-[64px] px-8 text-lg",
        md: "min-h-12 px-6 text-sm",
        sm: "min-h-9 px-4 text-xs",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type NeonButtonProps = ComponentProps<"button"> &
  VariantProps<typeof neonButtonVariants>;

export function NeonButton({
  className,
  variant,
  size,
  type = "button",
  ...props
}: NeonButtonProps) {
  return (
    <button
      type={type}
      className={cn(neonButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

type NeonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof neonButtonVariants>;

export function NeonLink({
  className,
  variant,
  size,
  ...props
}: NeonLinkProps) {
  return (
    <Link
      className={cn(neonButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
