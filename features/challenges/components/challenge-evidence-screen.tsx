"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton, NeonLink } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { getGroupNavigation } from "@/lib/navigation";
import type { Challenge } from "@/lib/types/challenge";
import type { Group } from "@/lib/types/group";

export function ChallengeEvidenceScreen({
  group,
  challenge,
}: {
  group: Group;
  challenge: Challenge;
}) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const detailHref = `/groups/${group.id}/challenges/${challenge.id}`;
  const listHref = `/groups/${group.id}/challenges`;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [message]);

  const applyFile = (file: File | undefined) => {
    if (!file) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setFileName(file.name);
  };

  const submitEvidence = () => {
    if (!previewUrl) {
      setMessage("証拠写真を撮影するか、アルバムから選んでください");
      return;
    }
    setMessage("証拠を提出しました。承認待ちです");
    window.setTimeout(() => {
      router.push(listHref);
    }, 900);
  };

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="チャレンジ" backHref={detailHref} />

      <NeonCard className="p-4">
        <h2 className="font-bold">{challenge.title}</h2>
        <p className="mt-1 text-xs text-white/55">{challenge.instruction}</p>
        <p className="mt-2 text-xs font-black text-[#e692ff]">
          クリアで{challenge.reward}pt
        </p>
      </NeonCard>

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
          {fileName ? (
            <p className="mt-3 truncate text-[10px] text-white/40">{fileName}</p>
          ) : null}
        </NeonCard>
      </section>

      <div className="mt-8 space-y-3">
        <NeonButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={submitEvidence}
        >
          完了
        </NeonButton>
        <NeonLink href={detailHref} variant="primary" size="lg" className="w-full">
          戻る
        </NeonLink>
      </div>

      {message ? (
        <div
          role="status"
          className="fixed bottom-[104px] left-1/2 z-50 w-[calc(100%-48px)] max-w-[354px] -translate-x-1/2 rounded-2xl border border-[#c038ff] bg-[#14031c]/95 px-4 py-3 text-center text-sm font-bold text-white shadow-[0_0_24px_rgba(192,56,255,0.55)]"
        >
          {message}
        </div>
      ) : null}
      <BottomNavigation items={getGroupNavigation(group.id)} active="challenges" />
    </MobileShell>
  );
}
