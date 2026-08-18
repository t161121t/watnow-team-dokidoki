import "server-only";
import { withRlsContext } from "@/lib/db/rls";

export async function createProfile(
  userId: string,
  nickname: string,
  avatarPath: string | null,
) {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<
      { id: string; nickname: string; avatar_path: string | null }[]
    >`SELECT * FROM create_profile(${nickname}, ${avatarPath})`,
  );
  return rows[0];
}
