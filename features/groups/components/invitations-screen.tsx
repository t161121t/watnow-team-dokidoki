import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import type { GroupInvitation } from "@/lib/types/group";

export function InvitationsScreen({
  invitations,
  backHref = "/groups",
}: {
  invitations: GroupInvitation[];
  backHref?: string;
}) {
  return (
    <MobileShell>
      <ScreenHeader title="グループ招待" backHref={backHref} />
      <p className="-mt-3 mb-6 text-sm text-white/55">
        {invitations.length}件の招待が届いています
      </p>

      <div className="space-y-4">
        {invitations.map((invitation) => (
          <NeonCard key={invitation.id} className="p-4">
            <div className="flex gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#c038ff] bg-[#1d0528] text-2xl shadow-[0_0_14px_rgba(192,56,255,0.45)]">
                {invitation.groupIcon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold">{invitation.groupName}</h2>
                <p className="mt-1 text-xs text-white/55">
                  {invitation.memberCount}人
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  {invitation.inviterName}さんから・{invitation.invitedAtLabel}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <MockActionButton
                variant="quiet"
                size="sm"
                feedback="招待を辞退しました"
              >
                辞退する
              </MockActionButton>
              <NeonLink
                href={`/groups/${invitation.groupId}`}
                variant="primary"
                size="sm"
              >
                参加する
              </NeonLink>
            </div>
          </NeonCard>
        ))}
      </div>
    </MobileShell>
  );
}
