import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Avatar } from "@/components/ui/avatar";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonField, NeonInput, NeonSelect } from "@/components/ui/neon-field";
import { GroupIcon } from "@/features/groups/components/group-icon";
import { InviteLinkSection } from "@/features/groups/components/invite-link-section";
import {
  avatarToneFromUserId,
  initialsFromNickname,
} from "@/features/groups/member-avatar";
import { getGroup } from "@/features/groups/server/get-group";
import { getInviteLink } from "@/features/groups/server/get-invite-link";
import { listGroupMembers } from "@/features/groups/server/list-group-members";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * グループ管理（⑤）画面。読み取り専用データは自分でserver/を直接呼んで
 * 取得する（docs/アーキテクチャ.md §1.1a: RSCのreadはactions.tsを経由しない。
 * 2026-08-22レビュー指摘で、page.tsx側でactions.ts経由になっていたものを
 * ここに移した）。groupIdはグループ一覧/ホーム側がまだモックデータのままで
 * UUIDでないIDを渡してくることがあるため、ここで先に弾いて404にする。
 */
export async function GroupManageScreen({ groupId }: { groupId: string }) {
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/manage`)}`);
  }

  const [group, members, inviteLink] = await Promise.all([
    getGroup(userId, groupId),
    listGroupMembers(userId, groupId),
    getInviteLink(userId, groupId),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="グループ管理" backHref={`/groups/${group.id}`} />

      <NeonCard className="mb-6 p-4">
        <div className="flex items-center gap-3">
          <GroupIcon
            iconPath={group.iconPath}
            className="size-14 rounded-full border border-[#c038ff] bg-[#1d0528] text-2xl shadow-[0_0_14px_rgba(192,56,255,0.45)]"
          />
          <h2 className="font-bold">{group.name}</h2>
        </div>
      </NeonCard>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">メンバー</h2>
          <span className="text-xs text-white/45">{members.length}人</span>
        </div>
        <div className="space-y-2.5">
          {members.map((member) => (
            <NeonCard key={member.userId} className="flex items-center gap-3 p-3.5">
              <Avatar
                initials={initialsFromNickname(member.user.nickname)}
                tone={avatarToneFromUserId(member.userId)}
                className="size-10"
              />
              <p className="min-w-0 flex-1 truncate text-sm font-bold">
                {member.user.nickname}
              </p>
              {member.role === "admin" ? (
                <span className="rounded-full bg-[#c038ff]/16 px-2 py-1 text-[9px] font-bold text-[#efb4ff]">
                  管理者
                </span>
              ) : null}
            </NeonCard>
          ))}
        </div>
      </section>

      <InviteLinkSection groupId={group.id} initialCode={inviteLink?.code ?? null} />

      {/*
        グループ設定（名前変更・オークション開放時間変更・削除）は対応する
        バックエンド（update_group/delete_group RPC）が未実装のため、
        今回のUI接続（issue #71）では見送ってモックのまま残す（ユーザー判断）。
      */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">グループ設定</h2>
        <NeonField id="manage-group-name" label="グループ名">
          <NeonInput id="manage-group-name" defaultValue={group.name} />
        </NeonField>
        <NeonField id="auction-open-seconds" label="オークション開放時間">
          <NeonSelect id="auction-open-seconds" defaultValue="86400">
            <option value="3600">1時間</option>
            <option value="21600">6時間</option>
            <option value="43200">12時間</option>
            <option value="86400">24時間</option>
            <option value="172800">48時間</option>
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
