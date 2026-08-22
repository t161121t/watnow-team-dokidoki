import type { ComponentProps } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const backButtonClassName =
  "inline-flex size-10 shrink-0 items-center justify-center text-[#c038ff] transition hover:text-[#d966ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0e] active:translate-y-px";

type BackButtonProps = {
  href?: string;
  onClick?: ComponentProps<"button">["onClick"];
  className?: string;
  "aria-label"?: string;
};

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 14-5-5 5-5" />
      <path strokeLinecap="round" d="M4 9h9a7 7 0 0 1 7 7v1" />
    </svg>
  );
}

export function BackButton({
  href,
  onClick,
  className,
  "aria-label": ariaLabel = "前の画面へ戻る",
}: BackButtonProps) {
  const combinedClassName = cn(backButtonClassName, className);

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={combinedClassName}>
        <BackIcon />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={combinedClassName}
    >
      <BackIcon />
    </button>
  );
}
