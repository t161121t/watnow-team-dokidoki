import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { GroupCard } from "@/features/groups/components/group-card";
import type { Group } from "@/lib/types/group";

/**
 * 招待URL方式への移行（issue #71）に伴い、「招待の確認」への導線は
 * ここには置かない（届いた招待の一覧という概念自体が無くなったため）。
 * 新しいグループへの参加はURL経由で直接/groups/join/[code]に着地する。
 */
export function GroupSwitcherScreen({ groups }: { groups: Group[] }) {
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

      <div className="space-y-3">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </MobileShell>
  );
}
