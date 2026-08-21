import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";

export function DealerAssignmentCard({ groupId }: { groupId: string }) {
  return (
    <NeonCard className="mt-4 border-[#268aff]/75 p-4 shadow-[0_0_17px_rgba(38,138,255,0.3)]">
      <p className="text-sm font-bold">ディーラー担当の秘密があります</p>
      <NeonLink
        href={`/groups/${groupId}/secrets/dealer-1`}
        variant="blue"
        size="sm"
        className="mt-3 w-full"
      >
        確認する
      </NeonLink>
    </NeonCard>
  );
}
