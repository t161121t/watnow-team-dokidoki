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
    <main className="relative min-h-svh overflow-x-hidden bg-[#020204] text-white">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2 bg-[url('/onboarding-background.png')] bg-[length:auto_120%] bg-top bg-no-repeat shadow-[0_0_90px_rgba(93,22,136,0.16)]">
        <div className="absolute inset-0 bg-black/20" />
      </div>
      <section
        className="relative mx-auto min-h-svh w-full max-w-[402px] overflow-x-hidden bg-transparent"
      >
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
