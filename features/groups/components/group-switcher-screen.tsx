import { redirect } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { GroupCard } from "@/features/groups/components/group-card";
import { getMyGroupsSummary } from "@/features/groups/server/get-my-groups-summary";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * グループ一覧（④）。groupsドメイン内の読み取りは自分でserver/を直接呼ぶ
 * （docs/アーキテクチャ.md §1.1a）。
 *
 * 招待URL方式への移行（issue #71）に伴い、「招待の確認」への導線は
 * ここには置かない（届いた招待の一覧という概念自体が無くなったため）。
 * 新しいグループへの参加はURL経由で直接/groups/join/[code]に着地する。
 */
export async function GroupSwitcherScreen() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent("/groups")}`);
  }

  const groups = await getMyGroupsSummary(userId);

  return (
    <MobileShell className="pt-[72px]">
      <ScreenHeader
        title="グループ一覧"
        action={
          <NeonLink href="/groups/new" variant="secondary" size="sm">
            作る
          </NeonLink>
        }
      />

      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#c038ff]/45 bg-black/50 px-6 py-12 text-center">
          <p className="font-bold">まだグループがありません</p>
        </div>
      )}
    </MobileShell>
  );
}
