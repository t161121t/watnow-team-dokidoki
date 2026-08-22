"use client";

import { cn } from "@/lib/utils";

export type SegmentedTab<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  label,
  className,
}: {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "grid rounded-full border border-[#c038ff]/55 bg-black/65 p-1 shadow-[0_0_13px_rgba(192,56,255,0.28)]",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={cn(
              "min-h-9 rounded-full px-1 text-[10px] font-bold text-white/45 transition",
              isActive &&
                "bg-[#c038ff]/22 text-white shadow-[0_0_12px_rgba(192,56,255,0.58)]",
            )}
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
