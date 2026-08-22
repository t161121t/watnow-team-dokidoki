"use client";

import { useMemo, useState } from "react";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SecretCard } from "@/features/secrets/components/secret-card";
import { getGroupNavigation } from "@/lib/navigation";
import type { Group } from "@/lib/types/group";
import type { Secret } from "@/lib/types/secret";

type Tab = "mine" | "dealer" | "collection";

const tabs = [
  { value: "mine", label: "自分の秘密" },
  { value: "dealer", label: "ディーラー" },
  { value: "collection", label: "落札済み" },
] as const;

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

      <SegmentedTabs
        tabs={tabs}
        value={tab}
        onValueChange={setTab}
        label="秘密リストの表示切り替え"
        className="mb-6"
      />

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
