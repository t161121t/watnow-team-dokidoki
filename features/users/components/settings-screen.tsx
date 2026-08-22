import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Avatar } from "@/components/ui/avatar";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { neonButtonVariants } from "@/components/ui/neon-button";
import { avatarToneFromUserId, initialsFromNickname } from "@/lib/avatar";
import { cn } from "@/lib/utils";

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <NeonCard className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-white/38">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold">{value}</p>
      </div>
      {/*
        ニックネーム/メールアドレス/パスワードの変更は対応するバックエンド
        （update_profile RPC・Supabase Authのメール/パスワード変更フロー）が
        未実装のため、今回のUI接続では見送ってモックのまま残す
        （features/groups/components/group-manage-screen.tsxの
        「グループ設定」と同じ判断）。
      */}
      <MockActionButton
        variant="quiet"
        size="sm"
        feedback={`${label}を変更しました`}
      >
        編集
      </MockActionButton>
    </NeonCard>
  );
}

export function SettingsScreen({
  user,
  backHref,
  onLogout,
}: {
  user: { id: string; nickname: string; email: string | null };
  backHref: string;
  // authドメインのServer Action（signOut）はここではimportしない
  // （features/<A>/componentsからfeatures/<B>/*への依存を作らないという
  // ドメイン境界ルールに反するため。呼び出し元のapp/settings/page.tsxが
  // 合成して渡す。2026-08-22レビュー指摘）。
  onLogout: () => Promise<void>;
}) {
  return (
    <MobileShell>
      <ScreenHeader title="アカウント設定" backHref={backHref} />

      <div className="mb-7 text-center">
        <Avatar
          initials={initialsFromNickname(user.nickname)}
          tone={avatarToneFromUserId(user.id)}
          className="mx-auto size-24 text-2xl"
        />
        <MockActionButton
          variant="secondary"
          size="sm"
          className="mt-4"
          feedback="アイコンを変更しました"
        >
          変更
        </MockActionButton>
      </div>

      <div className="space-y-3">
        <SettingRow label="ニックネーム" value={user.nickname} />
        <SettingRow label="メールアドレス" value={user.email ?? "未設定"} />
        <SettingRow label="パスワード" value="••••••••••••" />
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
