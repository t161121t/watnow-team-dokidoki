import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { SecretRow } from "@/features/secrets/types";

export type UpdateSecretBeforeListingInput = {
  body?: string;
  summary?: string;
  category?: string;
  rarity?: number;
  askingPrice?: number;
};

export async function updateSecretBeforeListing(
  userId: string,
  secretId: string,
  input: UpdateSecretBeforeListingInput,
): Promise<SecretRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<SecretRow[]>`
      SELECT * FROM update_secret_before_listing(
        ${secretId}::uuid,
        ${input.body ?? null},
        ${input.summary ?? null},
        ${input.category ?? null},
        ${input.rarity ?? null}::int,
        ${input.askingPrice ?? null}::int
      )
    `,
  );
  return rows[0];
}
