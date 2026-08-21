"use client";

import { useMemo, useState } from "react";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { SecretCard } from "@/features/secrets/components/secret-card";
import { getGroupNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types/group";
import type { Secret } from "@/lib/types/secret";

type Tab = "mine" | "dealer" | "collection";

export function SecretListScreen({
  group,
  secrets,
}: {
  group: Group;
  secrets: Secret[];
}) {
  const [tab, setTab] = useState<Tab>("mine");
  const visibleSecrets = useMemo(() => {
    if (tab === "dealer") return secrets.filter((secret) => secret.viewRole === "dealer");
    if (tab === "collection") return secrets.filter((secret) => secret.viewRole === "winner");
    return secrets.filter((secret) => secret.viewRole === "owner");
  }, [secrets, tab]);

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="秘密リスト"
        action={
          <NeonLink
            href={`/groups/${group.id}/secrets/new`}
            variant="secondary"
            size="sm"
          >
            登録
          </NeonLink>
        }
      />

      <div className="mb-6 grid grid-cols-3 rounded-full border border-[#c038ff]/55 bg-black/65 p-1 shadow-[0_0_13px_rgba(192,56,255,0.28)]">
        {(
          [
            ["mine", "自分の秘密"],
            ["dealer", "ディーラー"],
            ["collection", "落札済み"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            className={cn(
              "min-h-9 rounded-full px-1 text-[10px] font-bold text-white/45 transition",
              tab === value &&
                "bg-[#c038ff]/22 text-white shadow-[0_0_12px_rgba(192,56,255,0.58)]",
            )}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleSecrets.length > 0 ? (
        <div className="space-y-4">
          {visibleSecrets.map((secret) => (
            <SecretCard key={secret.id} secret={secret} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#c038ff]/45 bg-black/50 px-6 py-12 text-center">
          <p className="font-bold">秘密はありません</p>
        </div>
      )}
      <BottomNavigation items={getGroupNavigation(group.id)} active="secrets" />
    </MobileShell>
  );
}
