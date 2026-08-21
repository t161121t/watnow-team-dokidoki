import Link from "next/link";

import { cn } from "@/lib/utils";

export function ScreenHeader({
  title,
  backHref,
  action,
  className,
}: {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7", className)}>
      <div className="flex min-h-11 items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="前の画面へ戻る"
            className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center text-[#c038ff] transition hover:text-[#d966ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0e] active:translate-y-px"
          >
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
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] leading-tight font-bold [font-family:var(--font-noto-sans-jp)] [text-shadow:0_0_12px_rgba(208,66,255,0.9),0_0_36px_rgba(138,43,226,0.55)]">
            {title}
          </h1>
        </div>
        {action}
      </div>
    </header>
  );
}
