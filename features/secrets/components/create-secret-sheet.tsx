"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonField, NeonInput, NeonTextarea } from "@/components/ui/neon-field";
import { StarRating } from "@/components/ui/star-rating";
import { registerSecret } from "@/features/secrets/actions";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import { cn } from "@/lib/utils";
import type { SecretCategory } from "@/lib/types/secret";

const categories: SecretCategory[] = ["恋愛", "黒歴史", "趣味", "特技", "その他"];

/**
 * 秘密の新規登録（⑦）のボトムシート。秘密リスト（⑬）の上に重ねて表示する。
 *
 * 開閉はURLクエリ（`?new=1`）駆動: 開くのは一覧側のLink（scroll={false}）、
 * `open` propはpage.tsxがサーバー側で解釈した値。閉じるときはローカルstateで
 * 即座に閉じつつ `router.replace` でクエリを剥がす（replaceなのでブラウザ
 * バックで再度開くことはなく、逆に `?new=1` の履歴エントリからのバックでも
 * 閉じられる）。深いリンク（直接 `?new=1` を開いた場合）でも `router.back()`
 * と違ってアプリ外へ戻らない。
 */
export function CreateSecretSheet({
  groupId,
  tab,
  open: openByUrl,
}: {
  groupId: string;
  tab: SecretListTab;
  open: boolean;
}) {
  const router = useRouter();

  // URL（サーバーprops）とローカルの開閉を同期する。閉じ操作はナビゲーション
  // （RSC再描画）を待たずに即座にアニメーションさせたいのでローカルstateを持ち、
  // propの変化はレンダー中のstate調整で反映する（React公式の
  // "Adjusting some state when a prop changes" パターン）。
  const [open, setOpen] = useState(openByUrl);
  const [prevOpenByUrl, setPrevOpenByUrl] = useState(openByUrl);
  if (prevOpenByUrl !== openByUrl) {
    setPrevOpenByUrl(openByUrl);
    setOpen(openByUrl);
  }

  const closeTo = (href: string) => {
    setOpen(false);
    router.replace(href, { scroll: false });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // 現在のタブを保ったまま一覧に戻る（スクロール位置も維持）
      closeTo(`/groups/${groupId}/secrets?tab=${tab}`);
    }
  };

  const handleComplete = () => {
    // 旧 /secrets/new の完了処理（一覧のデフォルトタブへ遷移）を踏襲しつつ、
    // 登録した秘密が「自分の秘密」に反映されるようrefreshする
    closeTo(`/groups/${groupId}/secrets`);
    router.refresh();
  };

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>秘密を登録</BottomSheetTitle>
          <BottomSheetClose />
        </BottomSheetHeader>
        <BottomSheetBody>
          {/* フォームはシートの中で完結させる（閉じるとアンマウントされ、
              次に開いたとき初期状態から始まる） */}
          <CreateSecretForm groupId={groupId} onComplete={handleComplete} />
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}

/** 2ステップ（入力 → 確認）の登録フォーム。旧CreateSecretScreenのロジックを温存。 */
function CreateSecretForm({
  groupId,
  onComplete,
}: {
  groupId: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SecretCategory>("黒歴史");
  const [rarity, setRarity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const numericPrice = Number(price);
  const isPriceValid = Number.isInteger(numericPrice) && numericPrice > 0;
  const canContinue =
    summary.trim().length > 0 && body.trim().length > 0 && isPriceValid;

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
        askingPrice: numericPrice,
      });
      onComplete();
    } catch {
      setIsSubmitting(false);
      setError("秘密の登録に失敗しました");
    }
  };

  return (
    <>
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
          <NeonField id="secret-summary" label="秘密の概要">
            <NeonTextarea
              id="secret-summary"
              value={summary}
              maxLength={120}
              className="min-h-28"
              placeholder="秘密の内容を短く説明（ディーラーが閲覧できます）"
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
          <NeonField id="secret-price" label="秘密の価格">
            <NeonInput
              id="secret-price"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={price}
              placeholder="価格を入力"
              onChange={(event) => setPrice(event.target.value)}
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
            <p className="text-[10px] text-white/40">概要</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
              {summary}
            </p>
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
                <p className="text-white/38">価格</p>
                <p className="mt-1 font-bold">{numericPrice.toLocaleString()}pt</p>
              </div>
            </div>
          </NeonCard>
          {error ? (
            <p role="alert" className="text-[13px] font-bold text-[#ffb4c9]">
              {error}
            </p>
          ) : null}
          <div>
            <NeonButton
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handleRegister}
            >
              {isSubmitting ? "登録中…" : "登録する"}
            </NeonButton>
          </div>
        </div>
      )}
    </>
  );
}
