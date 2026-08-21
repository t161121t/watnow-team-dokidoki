import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Avatar } from "@/components/ui/avatar";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import type { User } from "@/lib/types/user";

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <NeonCard className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-white/38">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold">{value}</p>
      </div>
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

export function SettingsScreen({ user }: { user: User }) {
  return (
    <MobileShell>
      <ScreenHeader title="アカウント設定" backHref="/groups/night-owls/me" />

      <div className="mb-7 text-center">
        <Avatar
          initials={user.initials}
          tone={user.avatarColor}
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
        <SettingRow label="ニックネーム" value={user.name} />
        <SettingRow label="メールアドレス" value={user.email} />
        <SettingRow label="パスワード" value="••••••••••••" />
      </div>

      <NeonLink href="/login" variant="danger" size="lg" className="mt-8 w-full">
        ログアウト
      </NeonLink>
    </MobileShell>
  );
}
