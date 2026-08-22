/**
 * features/challenges/server/* の5関数（submitChallenge / approveChallenge /
 * createGroupChallenge / getGroupChallenges / getGroupChallengeAttempts）を
 * 実DBに対して検証する。Vitest等の自動テストは未導入（技術選定.md参照）の
 * ため、暫定的にここに置く。
 *
 * server/*.tsにはserver-onlyが付いており、通常のtsx実行だと
 * 「This module cannot be imported from a Client Component module」で
 * importに失敗する（server-onlyパッケージのexportsが"react-server"条件で
 * 空ファイルに、それ以外はthrowするindex.jsに解決されるため）。
 * package.jsonのverify:challengesスクリプトで`tsx --conditions=react-server`
 * を使い、"react-server"条件を有効にすることでこの制約を回避し、
 * 生SQLの再実装ではなく実際にexportされている関数を直接呼ぶ形にしている
 * （2026-08-22 PRレビュー指摘: 生SQLの再実装だとactions.ts/server/の引数順・
 * cast・配線が壊れてもこのスクリプトは気づけない、という問題への対応）。
 *
 * 各ガードの検証は、そのガードが無効化されても他のガードに隠れて偽陽性に
 * ならないよう、成立条件を切り分けて設計している（PR #56のCodexレビュー
 * 指摘: verify-auctions.mtsのself-bid/membershipガードが偽陽性になっていた
 * 教訓を踏襲）。
 *
 * 実行: npm run verify:challenges
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";
import { submitChallenge } from "@/features/challenges/server/submit-challenge";
import { approveChallenge } from "@/features/challenges/server/approve-challenge";
import { createGroupChallenge } from "@/features/challenges/server/create-group-challenge";
import { getGroupChallenges } from "@/features/challenges/server/get-group-challenges";
import { getGroupChallengeAttempts } from "@/features/challenges/server/get-group-challenge-attempts";

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

const admin = "00000000-0000-0000-0000-000000000040";
const submitter = "00000000-0000-0000-0000-000000000041";
const reviewer = "00000000-0000-0000-0000-000000000042";
const outsider = "00000000-0000-0000-0000-000000000043"; // どのグループにも属さない
const otherGroupAdmin = "00000000-0000-0000-0000-000000000044"; // 別グループの管理者
const users = [admin, submitter, reviewer, outsider, otherGroupAdmin];

let systemChallengeId: string | null = null;

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.user.createMany({
    data: users.map((id, i) => ({ id, nickname: `ChallengesTest${i}` })),
  });

  const [group1] = await withRlsContext(admin, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Challenges Test Group', NULL)`,
  );
  const groupId = group1.id;

  const [group2] = await withRlsContext(otherGroupAdmin, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Challenges Test Group 2', NULL)`,
  );
  const otherGroupId = group2.id;

  for (const uid of [submitter, reviewer]) {
    await prisma.groupMember.create({
      data: { groupId, userId: uid, role: "member", status: "active", invitedBy: admin, joinedAt: new Date() },
    });
    await prisma.wallet.create({ data: { groupId, userId: uid, balance: 0 } });
  }

  // --- create_group_challenge ---
  await assertRejects(
    () => createGroupChallenge(submitter, groupId, "不正な作成", null, 0, false, null),
    "create_group_challenge: admin以外は作成できない",
  );

  const challengeA = await createGroupChallenge(admin, groupId, "チャレンジA（通常）", null, 15, false, null);
  assert(challengeA.status === "active", "create_group_challenge: statusがactiveになる");

  const challengeB = await createGroupChallenge(admin, groupId, "チャレンジB（cooldown）", null, 10, false, 3600);
  const challengeC = await createGroupChallenge(admin, groupId, "チャレンジC（証跡必須）", null, 5, true, null);
  // 並行送信の直列化を検証する専用チャレンジ（cooldown無し。既存挑戦の有無で
  // 挙動が変わらないよう、他のテストで使い回さない）
  const challengeD = await createGroupChallenge(admin, groupId, "チャレンジD（並行送信テスト用）", null, 8, false, null);

  const systemChallenge = await prisma.challenge.create({
    data: {
      groupId: null,
      createdBy: null,
      title: "システムチャレンジ",
      rewardPoints: 20,
      requiresEvidencePhoto: false,
      cooldownSeconds: null,
      status: "active",
    },
  });
  systemChallengeId = systemChallenge.id;

  // --- submit_challenge ---
  await assertRejects(
    () => submitChallenge(outsider, groupId, challengeA.id, null),
    "submit_challenge: グループ外は挑戦できない",
  );

  await assertRejects(
    () => submitChallenge(otherGroupAdmin, otherGroupId, challengeA.id, null),
    "submit_challenge: 別グループのgroup-specificチャレンジには挑戦できない",
  );

  await assertRejects(
    () => submitChallenge(submitter, groupId, challengeC.id, null),
    "submit_challenge: 証跡必須チャレンジはevidence_path無しで挑戦できない",
  );

  // 2026-08-23レビュー指摘: p_evidence_pathは提出者本人のフォルダ配下かつ
  // challenge-evidenceバケットに実在する行のみ受け付ける
  // （prisma/sql/challenges/002_submit_and_review.sql参照）。
  await assertRejects(
    () => submitChallenge(submitter, groupId, challengeC.id, `${reviewer}/spoofed.png`),
    "submit_challenge: 他人のフォルダのevidence_pathは受け付けない",
  );
  await assertRejects(
    () => submitChallenge(submitter, groupId, challengeC.id, `${submitter}/does-not-exist.png`),
    "submit_challenge: 実在しないevidence_pathは受け付けない",
  );

  const evidencePathC = `${submitter}/${crypto.randomUUID()}.jpg`;
  await withRlsContext(submitter, (tx) => tx.$executeRaw`
    INSERT INTO storage.objects (bucket_id, name) VALUES ('challenge-evidence', ${evidencePathC})
  `);

  const attemptC = await submitChallenge(submitter, groupId, challengeC.id, evidencePathC);
  assert(attemptC.status === "pending", "submit_challenge: 証跡付きなら挑戦できる（status=pending）");

  const attempt1A = await submitChallenge(submitter, groupId, challengeA.id, null);
  assert(attempt1A.status === "pending", "submit_challenge: 通常チャレンジに挑戦できる（status=pending）");

  await assertRejects(
    () => submitChallenge(submitter, groupId, challengeA.id, null),
    "submit_challenge: 同じチャレンジにpending中の挑戦がある間は再挑戦できない",
  );

  const attempt1B = await submitChallenge(submitter, groupId, challengeB.id, null);
  assert(attempt1B.status === "pending", "submit_challenge: cooldown付きチャレンジにも初回は挑戦できる");

  // --- 並行送信: 同一(group, challenge, user)への同時submitは1件だけ成功する ---
  // pg_advisory_xact_lockで直列化しているため（002_submit_and_review.sql）、
  // 2つの呼び出しは順番に処理され、後者は「pending中の挑戦あり」で必ずreject
  // される想定（PR #67レビュー指摘: 二重付与を防ぐ不変条件の検証）。
  const concurrentResults = await Promise.allSettled([
    submitChallenge(submitter, groupId, challengeD.id, null),
    submitChallenge(submitter, groupId, challengeD.id, null),
  ]);
  const fulfilledCount = concurrentResults.filter((r) => r.status === "fulfilled").length;
  const rejectedCount = concurrentResults.filter((r) => r.status === "rejected").length;
  assert(
    fulfilledCount === 1 && rejectedCount === 1,
    `submit_challenge: 同時送信は1件だけ成功する（成功:${fulfilledCount}件、失敗:${rejectedCount}件）`,
  );
  const concurrentAttempts = await prisma.challengeAttempt.findMany({
    where: { groupId, challengeId: challengeD.id, userId: submitter },
  });
  assert(
    concurrentAttempts.length === 1,
    `submit_challenge: 同時送信でもDB上のattemptは1件だけ（実際:${concurrentAttempts.length}件）`,
  );

  // --- 読み取り: pendingキュー（承認前の時点で確認） ---
  const pendingAttempts = await getGroupChallengeAttempts(reviewer, groupId, { status: "pending" });
  assert(pendingAttempts.length === 4, "getGroupChallengeAttempts: pending中の挑戦が4件見える");

  // --- approve_challenge ---
  await assertRejects(
    () => approveChallenge(submitter, attempt1A.id, "approved"),
    "approve_challenge: 自分の挑戦は自分で承認できない",
  );

  await assertRejects(
    () => approveChallenge(outsider, attempt1A.id, "approved"),
    "approve_challenge: グループ外は承認できない",
  );

  const walletBefore = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: submitter } },
  });

  const approvedA = await approveChallenge(reviewer, attempt1A.id, "approved");
  assert(approvedA.status === "awarded", "approve_challenge: 承認するとstatusがawardedになる");
  assert(approvedA.reward_points === 15, "approve_challenge: reward_pointsがチャレンジの値で確定する");
  assert(approvedA.reviewed_by === reviewer, "approve_challenge: reviewed_byが承認者になる");
  assert(approvedA.awarded_ledger_id !== null, "approve_challenge: awarded_ledger_idが設定される");

  const walletAfterA = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: submitter } },
  });
  assert(
    walletAfterA.balance === walletBefore.balance + 15,
    `approve_challenge: 承認でwalletにreward_pointsがcreditされる（実際の差分:${walletAfterA.balance - walletBefore.balance}）`,
  );

  await assertRejects(
    () => approveChallenge(reviewer, attempt1A.id, "approved"),
    "approve_challenge: 既にレビュー済みの挑戦は再レビューできない",
  );

  const rejectedC = await approveChallenge(reviewer, attemptC.id, "rejected");
  assert(rejectedC.status === "rejected", "approve_challenge: 却下するとstatusがrejectedになる");
  assert(rejectedC.awarded_ledger_id === null, "approve_challenge: 却下時はawarded_ledger_idが設定されない");

  const walletAfterC = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: submitter } },
  });
  assert(
    walletAfterC.balance === walletAfterA.balance,
    "approve_challenge: 却下時はwalletのbalanceが変化しない",
  );

  const approvedB = await approveChallenge(reviewer, attempt1B.id, "approved");
  assert(approvedB.status === "awarded", "approve_challenge: cooldown付きチャレンジの挑戦も承認できる");

  // 並行送信テストで生き残った方のattemptも片付けておく（以降のgetGroupChallengeAttempts
  // の件数計算をシンプルに保つため）
  const [survivingConcurrentAttempt] = concurrentAttempts;
  await approveChallenge(reviewer, survivingConcurrentAttempt.id, "rejected");

  // --- cooldown（既存挑戦がpendingでなくなった後でも、cooldown中は再挑戦できないことを確認） ---
  await assertRejects(
    () => submitChallenge(submitter, groupId, challengeB.id, null),
    "submit_challenge: 前回の挑戦がpendingでなくなっていてもcooldown中は再挑戦できない",
  );

  // --- 読み取り: getGroupChallenges ---
  // 開発用DBに既存の（このスクリプト無関係の）active challengeが残っている
  // 場合でも壊れないよう、グローバルな件数ではなく期待するIDの含有/非含有で
  // 検証する（2026-08-22 PRレビュー指摘）。
  const challengesForMember = await getGroupChallenges(submitter, groupId);
  const memberIds = challengesForMember.map((c) => c.id);
  assert(
    [systemChallenge.id, challengeA.id, challengeB.id, challengeC.id, challengeD.id].every((id) =>
      memberIds.includes(id),
    ),
    "getGroupChallenges: グループメンバーにはsystem+group-specificが見える",
  );

  const challengesForOutsider = await getGroupChallenges(outsider, groupId);
  const outsiderIds = challengesForOutsider.map((c) => c.id);
  assert(
    outsiderIds.includes(systemChallenge.id),
    "getGroupChallenges: グループ外にもsystem challengeは見える",
  );
  assert(
    ![challengeA.id, challengeB.id, challengeC.id, challengeD.id].some((id) => outsiderIds.includes(id)),
    "getGroupChallenges: グループ外にはgroup-specificチャレンジは見えない（RLS境界）",
  );

  // --- 読み取り: getGroupChallengeAttempts（全件・ユーザー絞り込み） ---
  // attemptC/attempt1A/attempt1B + 並行送信テストで実際にINSERTされた1件（もう
  // 1件はDB書き込み前にreject）の計4件
  const allAttempts = await getGroupChallengeAttempts(reviewer, groupId);
  assert(allAttempts.length === 4, "getGroupChallengeAttempts: グループ内の全挑戦が4件見える");

  const submitterAttempts = await getGroupChallengeAttempts(reviewer, groupId, { userId: submitter });
  assert(
    submitterAttempts.length === 4,
    "getGroupChallengeAttempts: userId指定で本人の挑戦だけに絞り込める",
  );

  // --- challenge-evidenceバケットのRLS（prisma/sql/challenges/003_evidence_storage.sql） ---
  // Storage APIやファイルバイト自体は使わず、storage.objectsも通常のRLS付き
  // テーブルとして扱えることを利用し、withRlsContext経由の生SQLで直接検証する
  // （lib/db/rls.tsのwithRlsContextコメント参照。他のRLSテストと同じ手法）。
  // storage.objectsは直接DELETEできず（Supabase側のトリガーで拒否される。
  // 下のfinally参照）、クリーンアップにはservice roleキーでのStorage API
  // 呼び出しが要るが、このプロジェクトの.envにはservice roleキーを置いていない
  // （anon keyのみ）。再実行時に同名の重複行を積まないよう、pathをrandomUUID
  // で毎回変える。
  const evidencePath = `${submitter}/${crypto.randomUUID()}.png`;

  await assertRejects(
    () =>
      withRlsContext(submitter, (tx) => tx.$executeRaw`
        INSERT INTO storage.objects (bucket_id, name)
        VALUES ('challenge-evidence', ${`${reviewer}/spoofed.png`})
      `),
    "challenge_evidence_owner_insert: 他人のフォルダへは書き込めない",
  );

  await withRlsContext(submitter, (tx) => tx.$executeRaw`
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('challenge-evidence', ${evidencePath})
  `);

  const selfRead = await withRlsContext(submitter, (tx) => tx.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects WHERE bucket_id = 'challenge-evidence' AND name = ${evidencePath}
  `);
  assert(selfRead.length === 1, "challenge_evidence_select_self_or_group_member: 本人は自分の写真が見える");

  const outsiderReadBeforeAttempt = await withRlsContext(outsider, (tx) => tx.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects WHERE bucket_id = 'challenge-evidence' AND name = ${evidencePath}
  `);
  assert(
    outsiderReadBeforeAttempt.length === 0,
    "challenge_evidence_select_self_or_group_member: attempt行が無い間は本人以外に見えない",
  );

  const evidenceAttempt = await submitChallenge(submitter, groupId, challengeC.id, evidencePath);

  const reviewerReadAfterAttempt = await withRlsContext(reviewer, (tx) => tx.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects WHERE bucket_id = 'challenge-evidence' AND name = ${evidencePath}
  `);
  assert(
    reviewerReadAfterAttempt.length === 1,
    "challenge_evidence_select_self_or_group_member: attempt経由で同じgroupのメンバーは見える",
  );

  const outsiderReadAfterAttempt = await withRlsContext(outsider, (tx) => tx.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects WHERE bucket_id = 'challenge-evidence' AND name = ${evidencePath}
  `);
  assert(
    outsiderReadAfterAttempt.length === 0,
    "challenge_evidence_select_self_or_group_member: attempt経由でもグループ外には見えない",
  );

  await approveChallenge(reviewer, evidenceAttempt.id, "rejected");

  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // storage.objectsの直接DELETEはSupabase側で拒否される
    // （"Direct deletion from storage tables is not allowed. Use the Storage
    // API instead."）。cleanupにはservice roleキーが要るが、このプロジェクトの
    // .envには置いていないため、challenge-evidenceバケットのテスト行
    // （${submitter}/配下）は意図的にクリーンアップせず残す
    // （上のコメント・evidencePathのrandomUUID採番参照）。
    await prisma.challengeAttempt.deleteMany({ where: { userId: { in: users } } });
    await prisma.challenge.deleteMany({
      where: {
        OR: [{ createdBy: { in: users } }, ...(systemChallengeId ? [{ id: systemChallengeId }] : [])],
      },
    });
    await prisma.walletLedger.deleteMany({ where: { userId: { in: users } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: users } } });
    await prisma.groupMember.deleteMany({ where: { userId: { in: users } } });
    await prisma.group.deleteMany({ where: { createdBy: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
