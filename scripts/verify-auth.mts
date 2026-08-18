/**
 * create_profile RPC（prisma/sql/auth/001_create_profile.sql）が実DBに対して
 * 正しく動くかの手動検証スクリプト。Vitest等の自動テストは未導入（技術選定.md参照）
 * のため、暫定的にここに置く。
 *
 * Magic Linkのメール受信〜コールバック交換までは自動化できないため対象外。
 * ここではauth.uid()がセットされた状態(=ログイン済み)でcreate_profileを呼んだ
 * ときの挙動のみ検証する。
 *
 * 実行: npm run verify:auth
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

const userId = "00000000-0000-0000-0000-0000000000cc";

async function main() {
  await prisma.user.deleteMany({ where: { id: userId } });

  // 1. auth.uid()が無い状態（withRlsContextを通さない）では失敗する
  await assertRejects(
    () => prisma.$queryRaw`SELECT * FROM create_profile('No Auth', NULL)`,
    "未ログイン相当（auth.uid() IS NULL）では create_profile が失敗する",
  );

  // 2. ログイン済みなら users 行が作られる
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<
      { id: string; nickname: string; avatar_path: string | null }[]
    >`SELECT * FROM create_profile('Charlie', NULL)`,
  );
  assert(rows[0]?.nickname === "Charlie", "create_profile で users 行が作成される");
  assert(rows[0]?.id === userId, "作成された行の id が auth.uid() と一致する");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  assert(user?.nickname === "Charlie", "作成された users 行が実DBに存在する");

  // 3. 同じユーザーが2回目を呼ぶと失敗する（idの重複INSERT）
  await assertRejects(
    () =>
      withRlsContext(userId, (tx) =>
        tx.$queryRaw`SELECT * FROM create_profile('Dup', NULL)`,
      ),
    "同じユーザーが2回 create_profile すると失敗する（重複INSERT）",
  );

  // 4. 空nicknameは拒否される
  const userId2 = "00000000-0000-0000-0000-0000000000dd";
  await prisma.user.deleteMany({ where: { id: userId2 } });
  await assertRejects(
    () =>
      withRlsContext(userId2, (tx) =>
        tx.$queryRaw`SELECT * FROM create_profile('   ', NULL)`,
      ),
    "空白のみのnicknameは拒否される",
  );

  // 5. 51文字のnicknameは拒否される（DB側でもZodのmax(50)と同じ上限を強制）
  const userId3 = "00000000-0000-0000-0000-0000000000ee";
  await prisma.user.deleteMany({ where: { id: userId3 } });
  await assertRejects(
    () =>
      withRlsContext(userId3, (tx) =>
        tx.$queryRaw`SELECT * FROM create_profile(${"あ".repeat(51)}, NULL)`,
      ),
    "51文字のnicknameは拒否される",
  );

  // 6. 50文字ちょうど・前後空白ありは、trimされた上で作成できる（境界値）
  const userId4 = "00000000-0000-0000-0000-0000000000ff";
  await prisma.user.deleteMany({ where: { id: userId4 } });
  const trimmedRows = await withRlsContext(userId4, (tx) =>
    tx.$queryRaw<
      { nickname: string }[]
    >`SELECT * FROM create_profile(${`  ${"あ".repeat(50)}  `}, NULL)`,
  );
  assert(
    trimmedRows[0]?.nickname === "あ".repeat(50),
    "50文字ちょうど・前後空白ありはtrimされて作成できる",
  );

  console.log("\nALL CHECKS PASSED");
}

const testUserIds = [
  userId,
  "00000000-0000-0000-0000-0000000000dd",
  "00000000-0000-0000-0000-0000000000ee",
  "00000000-0000-0000-0000-0000000000ff",
];

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    await prisma.$disconnect();
  });
