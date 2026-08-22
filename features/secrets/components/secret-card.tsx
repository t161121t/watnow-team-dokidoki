import Link from "next/link";

import { NeonCard } from "@/components/ui/neon-card";
import { StarRating } from "@/components/ui/star-rating";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import type { SecretListItem } from "@/features/secrets/types";

export function SecretCard({
  secret,
  listTab,
}: {
  secret: SecretListItem;
  listTab: SecretListTab;
}) {
  const pathname =
    secret.viewRole === "winner"
      ? `/groups/${secret.groupId}/collection/${secret.id}`
      : `/groups/${secret.groupId}/secrets/${secret.id}`;

  return (
    <Link
      href={{ pathname, query: { tab: listTab } }}
      className="group block focus-visible:outline-none"
    >
      <NeonCard className="p-4 transition group-hover:-translate-y-0.5 group-hover:border-[#dc64ff] group-focus-visible:ring-2 group-focus-visible:ring-[#c038ff]">
        {secret.badgeLabel ? (
          <div className="mb-3 text-right">
            <span className="text-[10px] font-bold text-[#e591ff]">
              {secret.badgeLabel}
            </span>
          </div>
        ) : null}
        <h3 className="line-clamp-2 text-sm leading-6 font-bold">{secret.summary}</h3>
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/48">
          <span>{secret.category}</span>
          <StarRating value={secret.rarity} label="レア度" />
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-sm font-black">
          {secret.value.toLocaleString()}pt
        </p>
      </NeonCard>
    </Link>
  );
}
