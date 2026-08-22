import Link from "next/link";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { SecretCard } from "@/features/secrets/components/secret-card";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import { getGroupNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types/group";
import type { Secret } from "@/lib/types/secret";

export function SecretListScreen({
  group,
  secrets,
  tab,
}: {
  group: Group;
  secrets: Secret[];
  tab: SecretListTab;
}) {
  const visibleSecrets = secrets.filter((secret) => {
    if (tab === "dealer") return secret.viewRole === "dealer";
    if (tab === "collection") return secret.viewRole === "winner";
    return secret.viewRole === "owner";
  });

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

      <div className="mb-6 grid grid-cols-2 rounded-full border border-[#c038ff]/55 bg-black/65 p-1 shadow-[0_0_13px_rgba(192,56,255,0.28)]">
        {(
          [
            ["mine", "自分の秘密"],
            ["dealer", "ディーラー"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={{
              pathname: `/groups/${group.id}/secrets`,
              query: { tab: value },
            }}
            replace
            scroll={false}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white/45 transition",
              tab === value &&
                "bg-[#c038ff]/22 text-white shadow-[0_0_12px_rgba(192,56,255,0.58)]",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {visibleSecrets.length > 0 ? (
        <div className="space-y-4">
          {visibleSecrets.map((secret) => (
            <SecretCard key={secret.id} secret={secret} listTab={tab} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#c038ff]/45 bg-black/50 px-6 py-12 text-center">
          <p className="font-bold">秘密はありません</p>
        </div>
      )}
      <BottomNavigation
        items={getGroupNavigation(group.id)}
        active={tab === "collection" ? "me" : "secrets"}
      />
    </MobileShell>
  );
}
