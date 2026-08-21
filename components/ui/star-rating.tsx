"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  label = "評価",
  size = "sm",
  onValueChange,
  className,
}: {
  value: number;
  label?: string;
  size?: "sm" | "lg";
  onValueChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
}) {
  const stars = Array.from({ length: 5 }, (_, index) => {
    const starValue = (index + 1) as 1 | 2 | 3 | 4 | 5;
    const icon = (
      <Star
        className={cn(
          size === "lg" ? "size-7" : "size-3.5",
          starValue <= value
            ? "fill-[#e24cff] text-[#e24cff] drop-shadow-[0_0_5px_rgba(226,76,255,0.75)]"
            : "text-white/20",
        )}
      />
    );

    if (!onValueChange) return <span key={starValue}>{icon}</span>;

    return (
      <button
        key={starValue}
        type="button"
        aria-label={`${label}${starValue}`}
        aria-pressed={starValue === value}
        className="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff]"
        onClick={() => onValueChange(starValue)}
      >
        {icon}
      </button>
    );
  });

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${label} ${value}`}>
      {stars}
    </span>
  );
}
