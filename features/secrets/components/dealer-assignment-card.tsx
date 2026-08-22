import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";

/**
 * グループホーム（⑥）の「ディーラー担当の秘密があります」バナー。
 * auctionsドメインのデータ（dealer_id=自分の案件）はここから直接読めない
 * ため（feature UI間のドメイン境界。2026-08-23レビュー指摘）、呼び出し元の
 * app/groups/[groupId]/page.tsxでauctions側のreadを組み立て、承認待ちの
 * secret_group_item_idだけをpropsで渡す（features/secrets/components/
 * secret-list-screen.tsxのdealerタブと同じ、app/層で組み立てる方の
 * cross-domainパターン）。
 */
export function DealerAssignmentCard({
  groupId,
  pendingSecretGroupItemId,
}: {
  groupId: string;
  pendingSecretGroupItemId: string | null;
}) {
  if (!pendingSecretGroupItemId) {
    return null;
  }

  return (
    <NeonCard className="mt-4 p-4">
      <p className="text-sm font-bold">ディーラー担当の秘密があります</p>
      <NeonLink
        href={{
          pathname: `/groups/${groupId}/secrets/${pendingSecretGroupItemId}`,
          query: { tab: "dealer" },
        }}
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
      >
        確認する
      </NeonLink>
    </NeonCard>
  );
}
