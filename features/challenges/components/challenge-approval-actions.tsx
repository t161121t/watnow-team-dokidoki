"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NeonButton } from "@/components/ui/neon-button";
import { approveChallenge } from "@/features/challenges/actions";
import type { ApproveChallengeErrorStatus } from "@/features/challenges/actions";

const APPROVE_CHALLENGE_ERROR_MESSAGES: Record<ApproveChallengeErrorStatus, string> = {
  not_authenticated: "ログインが必要です",
  invalid_input: "入力内容を確認してください",
  attempt_not_found: "この提出は既に処理済みです",
  not_authorized: "この操作を行う権限がありません",
  cannot_review_own: "自分の提出は自分で承認できません",
  unknown_error: "処理に失敗しました",
};

export function ChallengeApprovalActions({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const decide = async (decision: "approved" | "rejected") => {
    setIsSubmitting(true);
    setMessage("");
    try {
      // throw/error.messageの文字列比較には依存しない（本番ビルドではServer
      // Actionのエラーメッセージがサニタイズされ判定できなくなるため。
      // 2026-08-23、features/auctions/actions.tsの同種の修正と同じ理由）。
      // approveChallengeは例外を投げず戻り値のstatusで成功/失敗理由を
      // 表現する（セッション切れ・入力不正も含む）。
      const result = await approveChallenge({ attemptId, decision });
      if (result.status === "ok") {
        router.refresh();
      } else {
        setMessage(APPROVE_CHALLENGE_ERROR_MESSAGES[result.status]);
      }
    } catch {
      // Server Actionの通信失敗等、上記statusが返らない予期しない例外の保険。
      setMessage("通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NeonButton
          variant="danger"
          size="sm"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={() => decide("rejected")}
        >
          却下
        </NeonButton>
        <NeonButton
          size="sm"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={() => decide("approved")}
        >
          承認
        </NeonButton>
      </div>
      {message ? (
        <p role="alert" className="mt-2 text-[11px] font-bold text-[#ffb4c9]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
