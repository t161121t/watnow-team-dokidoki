"use client";

import { useEffect, useState } from "react";

import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import {
  createGroupInviteLink,
  revokeGroupInviteLink,
} from "@/features/groups/actions";

/**
 * グループ管理（⑤）での招待URL発行/再発行/取り消し（issue #71）。旧
 * 「ニックネームで検索して個別招待する」UIの後継。
 */
export function InviteLinkSection({
  groupId,
  initialCode,
}: {
  groupId: string;
  initialCode: string | null;
}) {
  const [code, setCode] = useState(initialCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // origin はマウント後にのみ確定させる。renderで直接typeof windowを見ると
  // SSR（undefined）と初回クライアントrender（defined）でtree構造が変わり
  // hydration mismatchになる（2026-08-22レビュー指摘）。表示するUI（カード or
  // ボタン）自体はcodeの有無だけで決め、URL文字列だけがoriginを待つ形にする。
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    // window（ブラウザのみ存在する外部値）をマウント後に同期する、
    // react-hooks/set-state-in-effectが許容する想定内のユースケース
    // （SSR時点では原理的に取得できない値のため、render中に読むとhydration
    // mismatchになる。上のコメント・2026-08-22レビュー指摘参照）。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl = code && origin ? `${origin}/groups/join/${code}` : null;

  const handleCreate = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const link = await createGroupInviteLink({ groupId });
      setCode(link.code);
    } catch {
      setError("招待URLの発行に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await revokeGroupInviteLink({ groupId });
      setCode(null);
    } catch {
      setError("招待URLの取り消しに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("コピーに失敗しました");
    }
  };

  return (
    <section className="mt-7 space-y-4">
      <h2 className="text-lg font-bold">招待URL</h2>
      {code ? (
        <NeonCard className="space-y-3 p-4">
          <p className="truncate text-xs text-white/70">{inviteUrl ?? "読み込み中…"}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <NeonButton
              variant="quiet"
              size="sm"
              disabled={isSubmitting || !inviteUrl}
              onClick={handleCopy}
            >
              {copied ? "コピーしました" : "コピー"}
            </NeonButton>
            <NeonButton
              variant="danger"
              size="sm"
              disabled={isSubmitting}
              onClick={handleRevoke}
            >
              取り消す
            </NeonButton>
          </div>
          <NeonButton
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={isSubmitting}
            onClick={handleCreate}
          >
            再発行する
          </NeonButton>
        </NeonCard>
      ) : (
        <NeonButton
          className="w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={handleCreate}
        >
          {isSubmitting ? "発行中…" : "招待URLを発行する"}
        </NeonButton>
      )}
      {error ? (
        <p role="alert" className="text-[13px] font-bold text-[#ffb4c9]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
