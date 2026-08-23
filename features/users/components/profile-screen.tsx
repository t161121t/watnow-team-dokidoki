import type { ReactNode } from "react";
import Link from "next/link";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Avatar } from "@/components/ui/avatar";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { avatarToneFromUserId, initialsFromNickname } from "@/lib/avatar";
import { getGroupNavigation } from "@/lib/navigation";

export type ProfileCollectionItem = { id: string; summary: string };

export function ProfileScreen({
  groupId,
  user,
  balanceSection,
  collection,
}: {
  groupId: string;
  user: { id: string; nickname: string; email: string | null; avatarPath: string | null };
  balanceSection: ReactNode;
  collection: ProfileCollectionItem[];
}) {
  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="マイページ"
        action={
          <NeonLink href={`/settings?from=/groups/${groupId}/me`} variant="secondary" size="sm">
            設定
          </NeonLink>
        }
      />

      <NeonCard className="p-5 text-center">
        <Avatar
          initials={initialsFromNickname(user.nickname)}
          tone={avatarToneFromUserId(user.id)}
          avatarPath={user.avatarPath}
          className="mx-auto size-20 text-xl shadow-xl"
        />
        <h2 className="mt-3 text-xl font-bold">{user.nickname}</h2>
        {user.email ? <p className="mt-1 text-xs text-white/42">{user.email}</p> : null}
        <div className="mt-5 grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4">
          <div>
            <p className="text-[10px] text-white/38">ポイント</p>
            {balanceSection}
          </div>
          <div>
            <p className="text-[10px] text-white/38">落札した秘密</p>
            <p className="mt-1 font-black">{collection.length}件</p>
          </div>
        </div>
      </NeonCard>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <NeonLink href="/groups" variant="secondary" className="w-full">
          グループ切替
        </NeonLink>
        <NeonLink
          href={`/settings?from=/groups/${groupId}/me`}
          variant="secondary"
          className="w-full"
        >
          アカウント設定
        </NeonLink>
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">落札コレクション</h2>
        </div>
        {collection.length > 0 ? (
          collection.map((secret) => (
            <Link
              key={secret.id}
              href={`/groups/${groupId}/collection/${secret.id}`}
              className="block"
            >
              <NeonCard className="p-4">
                <p className="line-clamp-2 text-sm leading-5 font-bold">{secret.summary}</p>
              </NeonCard>
            </Link>
          ))
        ) : (
          <p className="text-sm text-white/45">まだ落札した秘密はありません</p>
        )}
      </section>
      <BottomNavigation items={getGroupNavigation(groupId)} active="me" />
    </MobileShell>
  );
}
