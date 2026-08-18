/**
 * avatarsバケットのRLSポリシー（prisma/sql/common/004_avatars_storage.sql）が
 * 実DBに対して正しく効くかの手動検証スクリプト。Vitest等の自動テストは未導入
 * （技術選定.md参照）のため、暫定的にここに置く。
 *
 * 実際のファイルアップロード（署名付きURL発行〜PUT）はSupabase Storage APIの
 * 認証情報（NEXT_PUBLIC_SUPABASE_ANON_KEY等）が必要で、このスクリプトの実行環境
 * では検証できない。ここではRLSがPostgres層の仕組みであることを利用し、
 * withRlsContextで疑似ログイン状態を作ってポリシーの効き方だけを検証する。
 *
 * 注意: storage.objectsへの直接DELETEはSupabaseのトリガーで禁止されている
 * （"Use the Storage API instead"）。このスクリプトはテスト後の後片付けのため
 * session設定 storage.allow_delete_query='true' でトリガーをバイパスする
 * （storage.protect_delete()参照）。本番運用でこの設定を使わないこと。
 *
 * 実行: npm run verify:storage
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function assertRejects(fn: () => Promise<unknown>, msg: string) {
  try {
    await fn();
  } catch {
    console.log(`OK: ${msg}`);
    return;
  }
  throw new Error(`FAIL: ${msg}（rejectされなかった）`);
}

const userA = "00000000-0000-0000-0000-0000000000a1";
const userB = "00000000-0000-0000-0000-0000000000b1";

async function main() {
  const bucket = await prisma.$queryRaw<
    {
      id: string;
      public: boolean;
      file_size_limit: bigint | null;
      allowed_mime_types: string[] | null;
    }[]
  >`SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'avatars'`;
  assert(
    bucket[0]?.id === "avatars" && bucket[0]?.public === true,
    "avatarsバケットが public で存在する",
  );
  assert(
    bucket[0]?.file_size_limit === BigInt(5242880),
    "file_size_limitが5MBに設定されている",
  );
  assert(
    JSON.stringify(bucket[0]?.allowed_mime_types) ===
      JSON.stringify(["image/png", "image/jpeg", "image/webp"]),
    "allowed_mime_typesが画像形式に制限されている",
  );

  // update/deleteポリシーは意図的に用意していない（immutable運用）
  const policies = await prisma.$queryRaw<{ policyname: string; cmd: string }[]>`
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'avatars_%'
  `;
  assert(
    policies.every((p) => p.cmd !== "UPDATE" && p.cmd !== "DELETE"),
    "avatarsにUPDATE/DELETEポリシーが存在しない（immutable運用）",
  );

  // 自分のフォルダ（先頭パスセグメント = auth.uid()）には書き込める
  await withRlsContext(userA, (tx) =>
    tx.$executeRaw`INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('avatars', ${`${userA}/test.png`}, ${userA})`,
  );
  const ownRow = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects WHERE bucket_id = 'avatars' AND name = ${`${userA}/test.png`}
  `;
  assert(ownRow.length === 1, "自分のフォルダへのINSERTが成功する");

  // 他人のフォルダには書き込めない
  await assertRejects(
    () =>
      withRlsContext(userA, (tx) =>
        tx.$executeRaw`INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('avatars', ${`${userB}/evil.png`}, ${userA})`,
      ),
    "他人のフォルダへのINSERTは拒否される（RLS）",
  );

  // 自分のフォルダであってもUPDATEはできない（immutable運用）。
  // UPDATE対象のポリシーが1つも無い場合、Postgres RLSはエラーを投げず
  // 「対象行0件」として黙って成功するため、影響行数で確認する
  // （脱退・kick後の元グループadminが現在のグループアイコンを書き換え/削除できて
  // しまう問題を避けるための設計。レビュー指摘で発覚）。
  const updatedRows = await withRlsContext(userA, (tx) =>
    tx.$executeRaw`UPDATE storage.objects SET name = ${`${userA}/renamed.png`} WHERE bucket_id = 'avatars' AND name = ${`${userA}/test.png`}`,
  );
  assert(updatedRows === 0, "自分のフォルダでもUPDATEは0行にしかならない（immutable運用）");

  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // storage.objectsへの直接DELETEはトリガーで禁止されているため、
    // このスクリプトの後片付け専用でバイパスする（本番では使わない）。
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('storage.allow_delete_query', 'true', true)`;
      await tx.$executeRaw`
        DELETE FROM storage.objects
        WHERE bucket_id = 'avatars' AND (name LIKE ${`${userA}/%`} OR name LIKE ${`${userB}/%`})
      `;
    });
    await prisma.$disconnect();
  });
