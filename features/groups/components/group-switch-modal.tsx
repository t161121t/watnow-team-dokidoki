"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { NeonLink } from "@/components/ui/neon-button";
import { GroupIcon } from "@/features/groups/components/group-icon";
import type { MyGroupSummary } from "@/features/groups/server/get-my-groups-summary";
import { cn } from "@/lib/utils";

/**
 * グループホーム（⑥）のグループ名タップで開くグループ切替モーダル（②）。
 * 以前は/groups（グループ一覧ページ）への遷移だったが、ホームを離れずに
 * 切り替えられるようにモーダル化した。
 *
 * グループ一覧データはRSC側（group-home-screen.tsx）が既存の
 * getMyGroupsSummaryで取得してpropsで渡す（このコンポーネントはClient
 * Componentなのでserver/を呼べない。型のみimportは実行コードを含まないためOK）。
 *
 * Dialog部品はcomponents/ui/に汎用部品として切り出さず、このファイル内に
 * 閉じて実装する（現時点で利用箇所が1つだけで、汎用オーバーレイ部品は
 * 別作業と衝突するため。2つ目の利用者が現れたら components/ui/ への
 * 切り出しを検討する）。
 */
export function GroupSwitchModal({
  currentGroupId,
  groups,
}: {
  currentGroupId: string;
  groups: MyGroupSummary[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const currentGroupName =
    groups.find((group) => group.id === currentGroupId)?.name ?? "";

  const handleSelect = (groupId: string) => {
    setOpen(false);
    if (groupId !== currentGroupId) {
      router.push(`/groups/${groupId}`);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <h1 className="min-w-0">
        <Dialog.Trigger
          aria-label={`グループ「${currentGroupName}」を切り替える`}
          className="group flex w-full min-w-0 items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0e]"
        >
          <span className="truncate text-[27px] font-bold [text-shadow:0_0_12px_rgba(208,66,255,0.9),0_0_36px_rgba(138,43,226,0.55)]">
            {currentGroupName}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-6 shrink-0 text-[#d966ff] transition-transform group-hover:translate-y-0.5"
            strokeWidth={3}
          />
        </Dialog.Trigger>
      </h1>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-48px)] max-w-[354px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-[#b72dff]/80 bg-[#0b0212]/95 p-5 text-white shadow-[0_0_18px_rgba(192,56,255,0.28),inset_0_0_22px_rgba(82,18,110,0.12)] backdrop-blur-md transition-all duration-200 outline-none data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-bold">
              グループ切り替え
            </Dialog.Title>
            <Dialog.Close
              aria-label="閉じる"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition hover:border-[#c038ff]/70 hover:bg-[#24062f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff]"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          <div className="max-h-[50svh] space-y-2.5 overflow-y-auto">
            {groups.map((group) => {
              const isCurrent = group.id === currentGroupId;
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => handleSelect(group.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff]",
                    isCurrent
                      ? "border-[#dd62ff]/90 bg-[#c038ff]/15 shadow-[0_0_14px_rgba(192,56,255,0.35)]"
                      : "border-white/12 bg-white/[0.04] hover:border-[#c038ff]/60 hover:bg-[#1c0525]/70",
                  )}
                >
                  <GroupIcon
                    iconPath={group.iconPath}
                    className="size-10 rounded-full border border-[#cf56ff]/75 bg-[#1c0525] text-[19px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {group.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-white/55">
                      <span>{group.memberCount}人</span>
                      <span className="font-bold text-white/80">
                        {group.balance.toLocaleString()}pt
                      </span>
                    </span>
                  </span>
                  {isCurrent ? (
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#efb4ff]">
                      <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                      選択中
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <NeonLink
            href="/groups/new"
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setOpen(false)}
          >
            グループを作る
          </NeonLink>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
