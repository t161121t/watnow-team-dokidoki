import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";

export function DealerAssignmentCard({ groupId }: { groupId: string }) {
  return (
    <NeonCard className="mt-4 p-4">
      <p className="text-sm font-bold">ディーラー担当の秘密があります</p>
      <NeonLink
        href={`/groups/${groupId}/secrets/dealer-1`}
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
      >
        確認する
      </NeonLink>
    </NeonCard>
  );
}
