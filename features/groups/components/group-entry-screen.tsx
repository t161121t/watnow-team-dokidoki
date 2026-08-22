import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";

/**
 * グループ参加/作成（④）。旧「招待の確認」（届いた招待一覧を承諾/辞退）は
 * URL招待方式への移行（issue #71）で廃止した。招待URLを受け取った人は
 * リンクから直接/groups/join/[code]へ着地して参加する（このハブ画面を経由
 * しない）ため、ここは新規作成の入口のみになる。
 */
export function GroupEntryScreen() {
  return (
    <MobileShell className="pt-[72px]">
      <ScreenHeader title="グループを作る" />
      <p className="-mt-3 text-sm text-white/55">
        まだ所属しているグループがありません。新しいグループを作りましょう
      </p>

      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-6 px-[30px]">
        <NeonLink href="/groups/new?from=join" size="lg" className="w-full">
          新規作成
        </NeonLink>
      </div>
    </MobileShell>
  );
}
