import Link from "next/link";

import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/lib/navigation";

export function BottomNavigation({
  items,
  active,
}: {
  items: NavigationItem[];
  active: string;
}) {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[402px] -translate-x-1/2 border-t border-[#8b27b9]/55 bg-black/90 px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(58,8,78,0.38)] backdrop-blur-xl"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = item.key === active;

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center justify-center rounded-2xl px-1 text-[10px] font-bold text-white/50 transition",
                  isActive && "text-white",
                )}
              >
                <span
                  className={cn(
                    "rounded-full px-1 py-2",
                    isActive &&
                      "[text-shadow:0_0_7px_#39a1ff,0_0_12px_#e437ff]",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
