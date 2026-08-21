import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Avatar } from "@/components/ui/avatar";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonField, NeonInput, NeonSelect } from "@/components/ui/neon-field";
import { getGroupNavigation } from "@/lib/navigation";
import type { Group, GroupMembership } from "@/lib/types/group";

export function GroupManageScreen({
  group,
  memberships,
}: {
  group: Group;
  memberships: GroupMembership[];
}) {
  return (
    <MobileShell withNavigation>
      <ScreenHeader title="グループ管理" backHref={`/groups/${group.id}`} />

      <NeonCard className="mb-6 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full border border-[#c038ff] bg-[#1d0528] text-2xl shadow-[0_0_14px_rgba(192,56,255,0.45)]">
            {group.icon}
          </span>
          <h2 className="font-bold">{group.name}</h2>
        </div>
      </NeonCard>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">メンバー</h2>
          <span className="text-xs text-white/45">{group.memberCount}人</span>
        </div>
        <div className="space-y-2.5">
          {memberships.map(({ user, role }) => (
            <NeonCard key={user.id} className="flex items-center gap-3 p-3.5">
              <Avatar initials={user.initials} tone={user.avatarColor} className="size-10" />
              <p className="min-w-0 flex-1 truncate text-sm font-bold">{user.name}</p>
              {role === "admin" ? (
                <span className="rounded-full bg-[#c038ff]/16 px-2 py-1 text-[9px] font-bold text-[#efb4ff]">
                  管理者
                </span>
              ) : null}
            </NeonCard>
          ))}
        </div>
      </section>

      <section className="mt-7 space-y-4">
        <h2 className="text-lg font-bold">メンバーを招待</h2>
        <NeonField id="member-search" label="ニックネーム・メールで検索">
          <NeonInput id="member-search" placeholder="名前またはメールアドレス" />
        </NeonField>
        <MockActionButton className="w-full" feedback="招待を送信しました">
          招待を送る
        </MockActionButton>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">グループ設定</h2>
        <NeonField id="manage-group-name" label="グループ名">
          <NeonInput id="manage-group-name" defaultValue={group.name} />
        </NeonField>
        <NeonField id="auction-time" label="定例オークション">
          <NeonSelect id="auction-time" defaultValue="friday-22">
            <option value="friday-22">毎週金曜 22:00</option>
            <option value="sunday-21">毎週日曜 21:00</option>
            <option value="manual">手動で開催</option>
          </NeonSelect>
        </NeonField>
        <MockActionButton className="w-full" feedback="変更を保存しました">
          変更を保存
        </MockActionButton>
        <MockActionButton
          variant="danger"
          className="w-full"
          feedback="削除操作は無効です"
        >
          グループを削除
        </MockActionButton>
      </section>
      <BottomNavigation items={getGroupNavigation(group.id)} active="home" />
    </MobileShell>
  );
}
