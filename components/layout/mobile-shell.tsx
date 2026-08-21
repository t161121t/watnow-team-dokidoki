import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MobileShell({
  children,
  className,
  withNavigation = false,
}: {
  children: ReactNode;
  className?: string;
  withNavigation?: boolean;
}) {
  return (
    <main className="min-h-svh bg-[#020204] text-white">
      <section
        className="relative mx-auto min-h-svh w-full max-w-[402px] overflow-x-hidden bg-[#090b0e] bg-[url('/onboarding-background.png')] bg-cover bg-top shadow-[0_0_90px_rgba(93,22,136,0.16)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
        <div
          className={cn(
            "relative z-10 flex min-h-svh flex-col px-[30px] pt-[54px]",
            withNavigation ? "pb-[118px]" : "pb-12",
            className,
          )}
        >
          {children}
        </div>
      </section>
    </main>
  );
}

