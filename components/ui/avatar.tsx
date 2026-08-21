import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/user";

const avatarTone: Record<User["avatarColor"], string> = {
  pink: "from-[#ff3ba7] to-[#7b1cff] shadow-[#ff3ba7]/40",
  blue: "from-[#28a5ff] to-[#1747d1] shadow-[#28a5ff]/40",
  violet: "from-[#a757ff] to-[#4b1ab5] shadow-[#a757ff]/40",
  amber: "from-[#ffb13b] to-[#e5447c] shadow-[#ffb13b]/40",
};

export function Avatar({
  initials,
  tone = "violet",
  className,
}: {
  initials: string;
  tone?: User["avatarColor"];
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/35 bg-gradient-to-br text-sm font-black tracking-wide text-white shadow-lg",
        avatarTone[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
