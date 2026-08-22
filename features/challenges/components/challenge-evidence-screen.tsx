"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { createChallengeEvidenceUploadUrl, submitChallenge } from "@/features/challenges/actions";
import type { SubmitChallengeErrorStatus } from "@/features/challenges/actions";
import { getGroupNavigation } from "@/lib/navigation";

const SUBMIT_CHALLENGE_ERROR_MESSAGES: Record<SubmitChallengeErrorStatus, string> = {
  not_authenticated: "ログインが必要です",
  invalid_input: "入力内容を確認してください",
  not_a_member: "このグループのメンバーではありません",
  challenge_not_available: "このチャレンジは現在利用できません",
  evidence_required: "証拠写真を撮影するか、アルバムから選んでください",
  invalid_evidence_path: "写真のアップロードに問題がありました。もう一度お試しください",
  in_cooldown: "クールダウン中はまだ挑戦できません",
  pending_attempt_exists: "既に承認待ちの提出があります",
  unknown_error: "提出に失敗しました",
};

function extensionOf(file: File): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = match?.[1]?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" ? ext : null;
}

export function ChallengeEvidenceScreen({
  groupId,
  challengeId,
  title,
  reward,
  requiresEvidencePhoto,
}: {
  groupId: string;
  challengeId: string;
  title: string;
  reward: number;
  requiresEvidencePhoto: boolean;
}) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const detailHref = `/groups/${groupId}/challenges/${challengeId}`;
  const listHref = `/groups/${groupId}/challenges`;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const applyFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setFile(nextFile);
  };

  const submitEvidence = async () => {
    setMessage("");

    if (requiresEvidencePhoto && !file) {
      setMessage("証拠写真を撮影するか、アルバムから選んでください");
      return;
    }

    setIsSubmitting(true);

    let evidencePath: string | null = null;
    if (file) {
      const extension = extensionOf(file);
      if (!extension) {
        setMessage("対応していない画像形式です");
        setIsSubmitting(false);
        return;
      }
      // アップロードURL発行・PUTはこのコンポーネント内で完結する処理
      // （signedUrlへの直接PUTはブラウザ→Storageの通信でServer Actionの
      // RPC境界を越えない）ため、ここはthrow/catchのままでよい。
      try {
        const { path, signedUrl } = await createChallengeEvidenceUploadUrl({ extension });
        const putResponse = await fetch(signedUrl, { method: "PUT", body: file });
        if (!putResponse.ok) {
          throw new Error("アップロードに失敗しました");
        }
        evidencePath = path;
      } catch {
        setMessage("アップロードに失敗しました");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // throw/error.messageの文字列比較には依存しない（本番ビルドでは
      // Server Actionのエラーメッセージがサニタイズされ判定できなくなる
      // ため。2026-08-23、features/auctions/actions.tsの同種の修正と
      // 同じ理由）。submitChallengeは例外を投げず戻り値のstatusで
      // 成功/失敗理由を表現する（セッション切れ・入力不正も含む）。
      const result = await submitChallenge({ groupId, challengeId, evidencePath });
      if (result.status === "ok") {
        router.push(listHref);
      } else {
        setMessage(SUBMIT_CHALLENGE_ERROR_MESSAGES[result.status]);
        setIsSubmitting(false);
      }
    } catch {
      // Server Actionの通信失敗等、上記statusが返らない予期しない例外の保険。
      setMessage("通信エラーが発生しました。もう一度お試しください");
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="チャレンジ" backHref={detailHref} />

      <NeonCard className="p-4">
        <h2 className="font-bold">{title}</h2>
        <p className="mt-2 text-xs font-black text-[#e692ff]">クリアで{reward}pt</p>
      </NeonCard>

      {requiresEvidencePhoto ? (
        <section className="mt-7">
          <h2 className="mb-3 text-lg font-bold">証拠を提出</h2>
          <NeonCard className="overflow-hidden p-4">
            {previewUrl ? (
              // ユーザーが選んだローカル画像のプレビュー。next/image は blob URL を扱わない
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="提出する証拠写真のプレビュー"
                className="mb-4 max-h-56 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="mb-4 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[#c038ff]/70 bg-black/40 text-center">
                <Camera className="size-8 text-[#e692ff]" aria-hidden="true" />
                <p className="mt-2 text-xs text-white/55">
                  写真を撮るか、アルバムから選んでください
                </p>
              </div>
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                applyFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={albumInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                applyFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <NeonButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4" aria-hidden="true" />
                写真を撮る
              </NeonButton>
              <NeonButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => albumInputRef.current?.click()}
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                アルバム
              </NeonButton>
            </div>
            {file ? (
              <p className="mt-3 truncate text-[10px] text-white/40">{file.name}</p>
            ) : null}
          </NeonCard>
        </section>
      ) : (
        <p className="mt-7 text-sm text-white/55">このチャレンジに証拠写真は不要です。</p>
      )}

      <div className="mt-8 space-y-3">
        <NeonButton
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={submitEvidence}
        >
          {isSubmitting ? "提出中…" : "完了"}
        </NeonButton>
      </div>

      {message ? (
        <p role="alert" className="mt-4 text-center text-[13px] font-bold text-[#ffb4c9]">
          {message}
        </p>
      ) : null}
      <BottomNavigation items={getGroupNavigation(groupId)} active="challenges" />
    </MobileShell>
  );
}
