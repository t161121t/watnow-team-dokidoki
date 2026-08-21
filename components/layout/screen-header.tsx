import { BackButton } from "@/components/ui/back-button";
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
          <BackButton
            href={backHref}
            className="-ml-2"
          />
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
