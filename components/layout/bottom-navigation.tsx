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
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[520px] -translate-x-1/2 border-t border-[#8b27b9]/55 bg-black/90 px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(58,8,78,0.38)] backdrop-blur-xl"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[9px] font-bold text-white/50 transition",
                  isActive && "text-white",
                )}
              >
                <Icon
                  className={cn(
                    "size-[22px] stroke-[1.8]",
                    isActive &&
                      "drop-shadow-[0_0_7px_#e437ff]",
                  )}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
