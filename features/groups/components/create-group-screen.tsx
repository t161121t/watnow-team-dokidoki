"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { BackButton } from "@/components/ui/back-button";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonField, NeonInput } from "@/components/ui/neon-field";
import { GroupIcon } from "@/features/groups/components/group-icon";
import { createGroup, createGroupIconUploadUrl } from "@/features/groups/actions";
import { cn } from "@/lib/utils";

const groupIcons = ["🌙", "⚡️", "🎧", "🪩", "🎲", "👾"];
const UPLOAD_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
} as const;

export function CreateGroupScreen({
  backHref = "/groups",
}: {
  backHref?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(groupIcons[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    const extension = UPLOAD_EXTENSIONS[file.type as keyof typeof UPLOAD_EXTENSIONS];
    if (!extension) {
      setError("png / jpeg / webp形式の画像を選んでください");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const { path, signedUrl } = await createGroupIconUploadUrl({ extension });
      const putResponse = await fetch(signedUrl, { method: "PUT", body: file });
      if (!putResponse.ok) {
        throw new Error("アップロードに失敗しました");
      }
      setIcon(path);
    } catch {
      setError("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const group = await createGroup({ name: name.trim(), iconPath: icon });
      router.push(`/groups/${group.id}`);
    } catch {
      setIsSubmitting(false);
      setError("グループの作成に失敗しました");
    }
  };

  return (
    <MobileShell>
      <ScreenHeader title="グループを作る" backHref={backHref} />

      <ol className="mb-8 flex items-center justify-center" aria-label="作成ステップ">
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
        <div className="space-y-7">
          <GroupIcon
            iconPath={icon}
            className="mx-auto size-24 rounded-full border-2 border-[#c038ff] bg-black/70 text-4xl shadow-[0_0_28px_rgba(192,56,255,0.62)]"
          />
          <NeonField id="group-name" label="グループ名">
            <NeonInput
              id="group-name"
              value={name}
              maxLength={20}
              placeholder="グループ名を入力"
              onChange={(event) => setName(event.target.value)}
            />
          </NeonField>
          <NeonButton
            size="lg"
            className="w-full"
            disabled={name.trim().length === 0}
            onClick={() => setStep(2)}
          >
            次へ
          </NeonButton>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-lg font-bold">アイコンを選ぶ</h2>
          <NeonCard className="grid grid-cols-3 gap-3 p-4">
            {groupIcons.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-label={`${candidate}を選択`}
                aria-pressed={candidate === icon}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-2xl border bg-black/65 text-3xl transition",
                  candidate === icon
                    ? "border-[#c038ff] shadow-[0_0_16px_#c038ff]"
                    : "border-white/15 hover:border-[#c038ff]/60",
                )}
                onClick={() => setIcon(candidate)}
              >
                {candidate}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={!groupIcons.includes(icon)}
              disabled={isUploading}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border bg-black/65 text-[11px] font-bold text-white/70 transition disabled:opacity-50",
                !groupIcons.includes(icon)
                  ? "border-[#c038ff] shadow-[0_0_16px_#c038ff]"
                  : "border-white/15 hover:border-[#c038ff]/60",
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {!groupIcons.includes(icon) ? (
                <GroupIcon iconPath={icon} className="size-9 rounded-full" />
              ) : (
                <span className="text-2xl" aria-hidden="true">
                  🖼️
                </span>
              )}
              {isUploading ? "アップロード中…" : "画像を選ぶ"}
            </button>
          </NeonCard>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              void handleFileSelected(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {error ? (
            <p role="alert" className="text-[13px] font-bold text-[#ffb4c9]">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-[0.7fr_1.3fr] gap-3">
            <BackButton
              onClick={() => setStep(1)}
              aria-label="前のステップへ戻る"
              className="justify-self-center"
            />
            <NeonButton
              size="lg"
              disabled={isSubmitting || isUploading}
              aria-busy={isSubmitting}
              onClick={handleCreate}
            >
              {isSubmitting ? "作成中…" : "作成する"}
            </NeonButton>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
