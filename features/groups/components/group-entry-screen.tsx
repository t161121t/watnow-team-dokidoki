import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";

export function GroupEntryScreen({
  invitationCount,
}: {
  invitationCount: number;
}) {
  return (
    <MobileShell className="pt-[72px]">
      <ScreenHeader title="グループ参加/作成" />
      <p className="-mt-3 text-sm text-white/55">
        グループを作るか、届いている招待を確認してください
      </p>

      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-6 px-[30px]">
        <NeonLink href="/groups/new?from=join" size="lg" className="w-full">
          新規作成
        </NeonLink>
        <NeonLink
          href="/groups/invitations?from=join"
          variant="secondary"
          size="lg"
          className="w-full"
        >
          招待の確認
          {invitationCount > 0 ? (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#ff3b9d] text-xs shadow-[0_0_10px_#ff3b9d]">
              {invitationCount}
            </span>
          ) : null}
        </NeonLink>
      </div>
    </MobileShell>
  );
}
