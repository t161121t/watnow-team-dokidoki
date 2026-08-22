"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { BackButton } from "@/components/ui/back-button";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonField, NeonInput, NeonTextarea } from "@/components/ui/neon-field";
import { StarRating } from "@/components/ui/star-rating";
import { registerSecret } from "@/features/secrets/actions";
import { cn } from "@/lib/utils";
import type { SecretCategory } from "@/lib/types/secret";

const categories: SecretCategory[] = ["恋愛", "黒歴史", "趣味", "特技", "その他"];

export function CreateSecretScreen({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SecretCategory>("黒歴史");
  const [rarity, setRarity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [value, setValue] = useState(200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canContinue = summary.trim().length > 0 && body.trim().length > 0;

  const handleRegister = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await registerSecret({
        groupId,
        body,
        summary,
        category,
        rarity,
        askingPrice: value,
      });
      router.push(`/groups/${groupId}/secrets`);
    } catch {
      setIsSubmitting(false);
      setError("秘密の登録に失敗しました");
    }
  };

  return (
    <MobileShell>
      <ScreenHeader
        title="秘密を登録"
        backHref={`/groups/${groupId}/secrets`}
      />

      <ol className="mb-7 flex items-center justify-center" aria-label="登録ステップ">
        {[1, 2].map((item) => (
          <li key={item} className="flex items-center last:flex-none">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full border text-sm font-bold",
                step >= item
                  ? "border-[#c038ff] bg-[#21052c] shadow-[0_0_14px_#c038ff]"
                  : "border-white/25 bg-black/60 text-white/40",
              )}
            >
              {item}
            </span>
            {item === 1 ? (
              <span className="h-px w-20 bg-gradient-to-r from-[#c038ff] to-white/20" />
            ) : null}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="space-y-6">
          <NeonField id="secret-summary" label="秘密の見出し">
            <NeonInput
              id="secret-summary"
              value={summary}
              maxLength={60}
              placeholder="見出しを入力"
              onChange={(event) => setSummary(event.target.value)}
            />
          </NeonField>
          <NeonField id="secret-body" label="秘密の本文">
            <NeonTextarea
              id="secret-body"
              value={body}
              maxLength={500}
              className="min-h-36"
              placeholder="本文を入力"
              onChange={(event) => setBody(event.target.value)}
            />
          </NeonField>
          <div>
            <p className="mb-2 text-sm font-bold">カテゴリ</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-xs font-bold transition",
                    category === item
                      ? "border-[#c038ff] bg-[#2b0738] shadow-[0_0_12px_rgba(192,56,255,0.65)]"
                      : "border-white/18 bg-black/60 text-white/55",
                  )}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">レア度</p>
            <div className="flex justify-between rounded-2xl border border-[#c038ff]/65 bg-black/65 px-4 py-3 shadow-[0_0_14px_rgba(192,56,255,0.35)]">
              <StarRating
                value={rarity}
                label="レア度"
                size="lg"
                onValueChange={setRarity}
              />
            </div>
          </div>
          <NeonField id="secret-value" label="秘密の価値">
            <NeonInput
              id="secret-value"
              type="number"
              min={50}
              max={1000}
              step={10}
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
            />
          </NeonField>
          <NeonButton
            size="lg"
            className="w-full"
            disabled={!canContinue}
            onClick={() => setStep(2)}
          >
            確認へ
          </NeonButton>
        </div>
      ) : (
        <div className="space-y-5">
          <NeonCard className="p-5">
            <p className="text-[10px] text-white/40">見出し</p>
            <h2 className="mt-2 text-base leading-7 font-bold">{summary}</h2>
            <div className="my-4 h-px bg-white/10" />
            <p className="text-[10px] text-white/40">本文</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{body}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
              <div>
                <p className="text-white/38">カテゴリ</p>
                <p className="mt-1 font-bold">{category}</p>
              </div>
              <div>
                <p className="text-white/38">レア度</p>
                <StarRating value={rarity} label="レア度" className="mt-1" />
              </div>
              <div>
                <p className="text-white/38">価値</p>
                <p className="mt-1 font-bold">{value.toLocaleString()}pt</p>
              </div>
            </div>
          </NeonCard>
          {error ? (
            <p role="alert" className="text-[13px] font-bold text-[#ffb4c9]">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-[0.7fr_1.3fr] gap-3">
            <BackButton
              onClick={() => setStep(1)}
              aria-label="入力内容を修正する"
              className="justify-self-center"
            />
            <NeonButton
              size="lg"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handleRegister}
            >
              {isSubmitting ? "登録中…" : "登録する"}
            </NeonButton>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
