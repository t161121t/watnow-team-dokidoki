"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { joinGroupViaInviteLink } from "@/features/groups/actions";

/**
 * 招待URL（/groups/join/[code]）の着地画面（issue #71）。旧「招待の確認」
 * （届いた招待一覧を承諾/辞退）は廃止し、URLを知っている本人がその場で
 * 参加を確定する形にした（docs/画面.md §3.1 ③参照）。
 */
export function JoinViaLinkScreen({ code }: { code: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setError(null);
    setIsSubmitting(true);
    // throw/error.messageの文字列比較には依存しない（本番ビルドではServer
    // Actionのエラーメッセージがサニタイズされ判定できなくなるため。
    // 2026-08-22レビュー指摘）。joinGroupViaInviteLinkは例外を投げず、
    // 戻り値のstatusで未ログイン/無効コード/成功を表現する。
    const result = await joinGroupViaInviteLink({ code });

    if (result.status === "unauthenticated") {
      router.push(`/login?redirect_to=${encodeURIComponent(`/groups/join/${code}`)}`);
      return;
    }
    if (result.status === "invalid_code") {
      setIsSubmitting(false);
      setError("この招待リンクは無効です（取り消されたか、URLが間違っている可能性があります）");
      return;
    }
    router.push(`/groups/${result.groupId}`);
  };

  return (
    <MobileShell className="pt-[72px]">
      <ScreenHeader title="グループに参加" backHref="/groups" />
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-6 px-[30px] text-center">
        <p className="text-sm text-white/70">招待されたグループに参加しますか？</p>
        <NeonButton
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={handleJoin}
        >
          {isSubmitting ? "参加中…" : "参加する"}
        </NeonButton>
        {error ? (
          <p role="alert" className="text-[13px] font-bold text-[#ffb4c9]">
            {error}
          </p>
        ) : null}
      </div>
    </MobileShell>
  );
}
