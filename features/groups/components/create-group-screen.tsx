"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonField, NeonInput } from "@/components/ui/neon-field";
import { cn } from "@/lib/utils";

const groupIcons = ["🌙", "⚡️", "🎧", "🪩", "🎲", "👾"];

export function CreateGroupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(groupIcons[0]);

  return (
    <MobileShell>
      <ScreenHeader title="グループを作る" backHref="/groups" />

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
          <div className="mx-auto flex size-24 items-center justify-center rounded-full border-2 border-[#c038ff] bg-black/70 text-4xl shadow-[0_0_28px_rgba(192,56,255,0.62)]">
            {icon}
          </div>
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
          </NeonCard>
          <div className="grid grid-cols-[0.7fr_1.3fr] gap-3">
            <NeonButton variant="quiet" size="lg" onClick={() => setStep(1)}>
              戻る
            </NeonButton>
            <NeonButton
              size="lg"
              onClick={() => router.push("/groups/night-owls")}
            >
              作成する
            </NeonButton>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
