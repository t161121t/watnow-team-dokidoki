import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { GroupCard } from "@/features/groups/components/group-card";
import type { Group } from "@/lib/types/group";

export function GroupSwitcherScreen({
  groups,
  invitationCount,
}: {
  groups: Group[];
  invitationCount: number;
}) {
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

      <NeonLink href="/groups/invitations" size="lg" className="mt-7 w-full">
        招待の確認
        {invitationCount > 0 ? (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#ff3b9d] text-xs shadow-[0_0_10px_#ff3b9d]">
            {invitationCount}
          </span>
        ) : null}
      </NeonLink>
    </MobileShell>
  );
}
