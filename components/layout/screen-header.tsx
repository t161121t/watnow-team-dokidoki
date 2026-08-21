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
            className="-ml-1 inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold text-white/70 transition hover:text-white"
          >
            戻る
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
