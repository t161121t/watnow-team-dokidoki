"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonField, NeonInput, NeonSelect, NeonTextarea } from "@/components/ui/neon-field";
import { createGroupChallenge } from "@/features/challenges/actions";
import type { CreateGroupChallengeErrorStatus } from "@/features/challenges/actions";

const CREATE_CHALLENGE_ERROR_MESSAGES: Record<CreateGroupChallengeErrorStatus, string> = {
  not_authenticated: "ログインが必要です",
  invalid_input: "入力内容を確認してください",
  not_authorized: "この操作を行う権限がありません（幹事のみ作成できます）",
  unknown_error: "チャレンジの作成に失敗しました",
};

const COOLDOWN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "なし（何度でも挑戦可）" },
  { value: "3600", label: "1時間" },
  { value: "21600", label: "6時間" },
  { value: "43200", label: "12時間" },
  { value: "86400", label: "24時間" },
];

export function CreateChallengeScreen({ groupId }: { groupId: string }) {
  const router = useRouter();
  const listHref = `/groups/${groupId}/challenges`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardPoints, setRewardPoints] = useState("");
  const [requiresEvidencePhoto, setRequiresEvidencePhoto] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericRewardPoints = Number(rewardPoints);
  const isRewardValid = Number.isInteger(numericRewardPoints) && numericRewardPoints >= 0;
  const canSubmit = title.trim().length > 0 && isRewardValid;

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("チャレンジ名とポイント（0以上の整数）を入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      // throw/error.messageの文字列比較には依存しない（本番ビルドではServer
      // Actionのエラーメッセージがサニタイズされ判定できなくなるため。
      // features/auctions/actions.tsの同種の修正と同じ理由）。
      const result = await createGroupChallenge({
        groupId,
        title: title.trim(),
        description: description.trim().length > 0 ? description.trim() : null,
        rewardPoints: numericRewardPoints,
        requiresEvidencePhoto,
        cooldownSeconds: cooldownSeconds ? Number(cooldownSeconds) : null,
      });
      if (result.status === "ok") {
        router.push(listHref);
      } else {
        setError(CREATE_CHALLENGE_ERROR_MESSAGES[result.status]);
      }
    } catch {
      // Server Actionの通信失敗等、上記statusが返らない予期しない例外の保険。
      setError("通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell>
      <ScreenHeader title="チャレンジを作成" backHref={listHref} />

      <div className="space-y-6">
        <NeonField id="challenge-title" label="チャレンジ名">
          <NeonInput
            id="challenge-title"
            value={title}
            maxLength={100}
            placeholder="例: グループの誰かに挨拶する"
            onChange={(event) => setTitle(event.target.value)}
          />
        </NeonField>

        <NeonField id="challenge-description" label="説明（任意）">
          <NeonTextarea
            id="challenge-description"
            value={description}
            maxLength={500}
            className="min-h-24"
            placeholder="挑戦の内容や条件を入力"
            onChange={(event) => setDescription(event.target.value)}
          />
        </NeonField>

        <NeonField id="challenge-reward" label="報酬ポイント">
          <NeonInput
            id="challenge-reward"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={rewardPoints}
            placeholder="例: 10"
            onChange={(event) => setRewardPoints(event.target.value)}
          />
        </NeonField>

        <NeonField id="challenge-cooldown" label="再挑戦までの間隔">
          <NeonSelect
            id="challenge-cooldown"
            value={cooldownSeconds}
            onChange={(event) => setCooldownSeconds(event.target.value)}
          >
            {COOLDOWN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NeonSelect>
        </NeonField>

        <label className="flex items-center gap-2.5 text-sm font-bold">
          <input
            type="checkbox"
            checked={requiresEvidencePhoto}
            onChange={(event) => setRequiresEvidencePhoto(event.target.checked)}
            className="size-5 rounded border-[#c038ff] accent-[#c038ff]"
          />
          証拠写真を必須にする
        </label>

        {error ? (
          <p role="alert" className="text-[13px] font-bold text-[#ffb4c9]">
            {error}
          </p>
        ) : null}

        <NeonButton
          size="lg"
          className="w-full"
          disabled={isSubmitting || !canSubmit}
          aria-busy={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "作成中…" : "作成する"}
        </NeonButton>
      </div>
    </MobileShell>
  );
}
