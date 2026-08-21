import Link from "next/link";

import { NeonCard } from "@/components/ui/neon-card";
import type { Secret } from "@/lib/types/secret";

const statusLabel: Record<Secret["status"], string> = {
  registered: "保管中",
  listed: "出品確認中",
  on_auction: "オークション中",
  sold: "落札済み",
  returned: "返却済み",
};

export function SecretCard({ secret }: { secret: Secret }) {
  const href =
    secret.viewRole === "winner"
      ? `/groups/${secret.groupId}/collection/${secret.id}`
      : `/groups/${secret.groupId}/secrets/${secret.id}`;

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <NeonCard className="p-4 transition group-hover:-translate-y-0.5 group-hover:border-[#dc64ff] group-focus-visible:ring-2 group-focus-visible:ring-[#55a8ff]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-full border border-[#c038ff]/45 bg-[#24062f]/75 px-2.5 py-1 text-[10px] font-bold text-[#efadff]">
            {secret.viewRole === "dealer" ? "ディーラー担当" : statusLabel[secret.status]}
          </span>
          {secret.remainingLabel ? (
            <span className="text-[10px] font-bold text-[#66aaff]">
              {secret.remainingLabel}
            </span>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-sm leading-6 font-bold">{secret.summary}</h3>
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/48">
          <span>{secret.category}</span>
          <span>レア度 {secret.rarity}</span>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-sm font-black">
          {secret.value.toLocaleString()}pt
        </p>
      </NeonCard>
    </Link>
  );
}
