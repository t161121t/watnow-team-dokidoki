"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Avatar } from "@/components/ui/avatar";
import { NeonButton, neonButtonVariants } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonInput } from "@/components/ui/neon-field";
import {
  createAvatarUploadUrl,
  updateEmail,
  updatePassword,
  updateProfile,
} from "@/features/auth/actions";
import { avatarToneFromUserId, initialsFromNickname } from "@/lib/avatar";
import { cn } from "@/lib/utils";

// features/auth/actions.tsのcreateAvatarUploadUrlが受け付ける拡張子と同じ
// （lib/supabase/storage.tsのAVATAR_EXTENSIONS）。feature-uiからlib/supabase/*を
// 直接importできない（ESLint boundaries）ためリテラルで持つ。
const AVATAR_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const;
type AvatarExtension = (typeof AVATAR_EXTENSIONS)[number];

function extensionFromFile(file: File): AvatarExtension | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (AVATAR_EXTENSIONS as readonly string[]).includes(ext ?? "")
    ? (ext as AvatarExtension)
    : null;
}

/** ニックネーム編集。インライン展開してNeonInput+保存/キャンセルを出す。 */
function NicknameRow({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nickname);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <NeonCard className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-white/38">ニックネーム</p>
          <p className="mt-0.5 truncate text-sm font-bold">{nickname}</p>
        </div>
        <NeonButton
          variant="quiet"
          size="sm"
          onClick={() => {
            setValue(nickname);
            setError(null);
            setEditing(true);
          }}
        >
          編集
        </NeonButton>
      </NeonCard>
    );
  }

  const canSave = value.trim().length > 0 && value.trim().length <= 50;

  const handleSave = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await updateProfile({ nickname: value.trim() });
      if (result.status === "ok") {
        setEditing(false);
        router.refresh();
      } else {
        setError("ニックネームの変更に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NeonCard className="space-y-3 p-4">
      <p className="text-[10px] text-white/38">ニックネーム</p>
      <NeonInput
        value={value}
        maxLength={50}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
      />
      {error ? (
        <p role="alert" className="text-[12px] font-bold text-[#ffb4c9]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <NeonButton
          size="sm"
          className="flex-1"
          disabled={!canSave || isSubmitting}
          aria-busy={isSubmitting}
          onClick={handleSave}
        >
          {isSubmitting ? "保存中…" : "保存"}
        </NeonButton>
        <NeonButton
          variant="quiet"
          size="sm"
          className="flex-1"
          disabled={isSubmitting}
          onClick={() => setEditing(false)}
        >
          キャンセル
        </NeonButton>
      </div>
    </NeonCard>
  );
}

/**
 * メールアドレス編集。Supabase Authの仕様上、送信しても即座には反映されず
 * 新しいメールアドレス宛の確認リンクを踏んだ時点で反映される
 * （features/auth/actions.tsのupdateEmailコメント参照）。そのためここでは
 * 現在のメールアドレス表示は変えず、送信結果のメッセージだけ出す。
 */
function EmailRow({ email }: { email: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!editing) {
    return (
      <NeonCard className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-white/38">メールアドレス</p>
          <p className="mt-0.5 truncate text-sm font-bold">{email ?? "未設定"}</p>
          {message ? (
            <p className={cn("mt-1 text-[11px] font-bold", isError ? "text-[#ffb4c9]" : "text-[#9be6b6]")}>
              {message}
            </p>
          ) : null}
        </div>
        <NeonButton
          variant="quiet"
          size="sm"
          onClick={() => {
            setValue(email ?? "");
            setMessage(null);
            setEditing(true);
          }}
        >
          編集
        </NeonButton>
      </NeonCard>
    );
  }

  const handleSubmit = async () => {
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await updateEmail({ email: value.trim() });
      if (result.status === "confirmation_required") {
        setIsError(false);
        setMessage("確認メールを送信しました。新しいアドレス宛のリンクを開くと反映されます");
        setEditing(false);
      } else if (result.status === "already_registered") {
        setIsError(true);
        setMessage("このメールアドレスは既に使われています");
      } else if (result.status === "rate_limited") {
        setIsError(true);
        setMessage("しばらく時間をおいてからもう一度お試しください");
      } else {
        setIsError(true);
        setMessage("メールアドレスの変更に失敗しました");
      }
    } catch {
      setIsError(true);
      setMessage("通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NeonCard className="space-y-3 p-4">
      <p className="text-[10px] text-white/38">新しいメールアドレス</p>
      <NeonInput
        type="email"
        value={value}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
      />
      {message ? (
        <p role="alert" className={cn("text-[12px] font-bold", isError ? "text-[#ffb4c9]" : "text-[#9be6b6]")}>
          {message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <NeonButton
          size="sm"
          className="flex-1"
          disabled={!value.trim() || isSubmitting}
          aria-busy={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "送信中…" : "確認メールを送る"}
        </NeonButton>
        <NeonButton
          variant="quiet"
          size="sm"
          className="flex-1"
          disabled={isSubmitting}
          onClick={() => setEditing(false)}
        >
          キャンセル
        </NeonButton>
      </div>
    </NeonCard>
  );
}

/**
 * パスワード編集。2026-08-23ユーザー報告: ボタン1つで即座に変更されて
 * しまう（旧MockActionButton）のは危険なため、新しいパスワードを2回
 * 入力させ、明示的に送信して初めて変更する（誤操作防止）。
 */
function PasswordRow() {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!editing) {
    return (
      <NeonCard className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-white/38">パスワード</p>
          <p className="mt-0.5 truncate text-sm font-bold">••••••••••••</p>
          {message ? (
            <p className={cn("mt-1 text-[11px] font-bold", isError ? "text-[#ffb4c9]" : "text-[#9be6b6]")}>
              {message}
            </p>
          ) : null}
        </div>
        <NeonButton
          variant="quiet"
          size="sm"
          onClick={() => {
            setPassword("");
            setConfirmPassword("");
            setMessage(null);
            setEditing(true);
          }}
        >
          編集
        </NeonButton>
      </NeonCard>
    );
  }

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = password.length >= 8 && password === confirmPassword;

  const handleSubmit = async () => {
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await updatePassword({ password });
      if (result.status === "ok") {
        setIsError(false);
        setMessage("パスワードを変更しました");
        setEditing(false);
      } else if (result.status === "invalid_password_format") {
        setIsError(true);
        setMessage("このパスワードは使用できません（8文字以上にしてください）");
      } else {
        setIsError(true);
        setMessage("パスワードの変更に失敗しました");
      }
    } catch {
      setIsError(true);
      setMessage("通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NeonCard className="space-y-3 p-4">
      <div>
        <p className="mb-1.5 text-[10px] text-white/38">新しいパスワード（8文字以上）</p>
        <NeonInput
          type="password"
          value={password}
          autoFocus
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <p className="mb-1.5 text-[10px] text-white/38">新しいパスワード（確認用）</p>
        <NeonInput
          type="password"
          value={confirmPassword}
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {mismatch ? (
          <p className="mt-1 text-[11px] font-bold text-[#ffb4c9]">パスワードが一致しません</p>
        ) : null}
      </div>
      {message ? (
        <p role="alert" className={cn("text-[12px] font-bold", isError ? "text-[#ffb4c9]" : "text-[#9be6b6]")}>
          {message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <NeonButton
          size="sm"
          className="flex-1"
          disabled={!canSubmit || isSubmitting}
          aria-busy={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "変更中…" : "変更する"}
        </NeonButton>
        <NeonButton
          variant="quiet"
          size="sm"
          className="flex-1"
          disabled={isSubmitting}
          onClick={() => setEditing(false)}
        >
          キャンセル
        </NeonButton>
      </div>
    </NeonCard>
  );
}

export function SettingsScreen({
  user,
  backHref,
  onLogout,
}: {
  user: { id: string; nickname: string; email: string | null; avatarPath: string | null };
  backHref: string;
  // authドメインのServer Action（signOut）はここではimportしない
  // （features/<A>/componentsからfeatures/<B>/*への依存を作らないという
  // ドメイン境界ルールに反するため。呼び出し元のapp/settings/page.tsxが
  // 合成して渡す。2026-08-22レビュー指摘）。
  onLogout: () => Promise<void>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState(user.avatarPath);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = extensionFromFile(file);
    if (!extension) {
      setAvatarError("png / jpg / jpeg / webp形式の画像を選んでください");
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const { path, signedUrl } = await createAvatarUploadUrl({ extension });
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("upload failed");
      }
      const result = await updateProfile({ avatarPath: path });
      if (result.status !== "ok") {
        throw new Error(result.status);
      }
      setAvatarPath(path);
      router.refresh();
    } catch {
      setAvatarError("アイコンの変更に失敗しました");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <MobileShell>
      <ScreenHeader title="アカウント設定" backHref={backHref} />

      <div className="mb-7 text-center">
        <Avatar
          initials={initialsFromNickname(user.nickname)}
          tone={avatarToneFromUserId(user.id)}
          avatarPath={avatarPath}
          className="mx-auto size-24 text-2xl"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
        <NeonButton
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={isUploadingAvatar}
          aria-busy={isUploadingAvatar}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploadingAvatar ? "アップロード中…" : "変更"}
        </NeonButton>
        {avatarError ? (
          <p role="alert" className="mt-2 text-[12px] font-bold text-[#ffb4c9]">
            {avatarError}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <NicknameRow nickname={user.nickname} />
        <EmailRow email={user.email} />
        <PasswordRow />
      </div>

      <form action={onLogout}>
        <button
          type="submit"
          className={cn(neonButtonVariants({ variant: "danger", size: "lg" }), "mt-8 w-full")}
        >
          ログアウト
        </button>
      </form>
    </MobileShell>
  );
}
