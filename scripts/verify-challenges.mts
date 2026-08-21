/**
 * features/challenges/server/* → prisma/sql/challenges/*.sql（submit_challenge /
 * approve_challenge / create_group_challenge）と、RPC/Viewを経由しない読み取り
 * 2関数（getGroupChallenges / getGroupChallengeAttempts）を実DBに対して検証する。
 * Vitest等の自動テストは未導入（技術選定.md参照）のため、暫定的にここに置く。
 *
 * 他のverifyスクリプトと同様、RPCはwithRlsContext経由の生SQLで直接叩く
 * （features/challenges/server/*はserver-onlyが付いておりtsx実行環境からは
 * importできないため。呼び出しているSQL文自体は同一）。読み取り2関数は
 * 素のPrismaクエリのため、prisma model呼び出しをそのまま使う。
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
    () =>
      withRlsContext(submitter, (tx) =>
        tx.$executeRaw`SELECT create_group_challenge(${groupId}::uuid, ${"不正な作成"}::text, NULL, ${0}::int, ${false}::boolean, NULL)`,
      ),
    "create_group_challenge: admin以外は作成できない",
  );

  const [challengeA] = await withRlsContext(admin, (tx) =>
    tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT * FROM create_group_challenge(${groupId}::uuid, ${"チャレンジA（通常）"}::text, NULL, ${15}::int, ${false}::boolean, NULL)
    `,
  );
  assert(challengeA.status === "active", "create_group_challenge: statusがactiveになる");

  const [challengeB] = await withRlsContext(admin, (tx) =>
    tx.$queryRaw<{ id: string }[]>`
      SELECT * FROM create_group_challenge(${groupId}::uuid, ${"チャレンジB（cooldown）"}::text, NULL, ${10}::int, ${false}::boolean, ${3600}::int)
    `,
  );

  const [challengeC] = await withRlsContext(admin, (tx) =>
    tx.$queryRaw<{ id: string }[]>`
      SELECT * FROM create_group_challenge(${groupId}::uuid, ${"チャレンジC（証跡必須）"}::text, NULL, ${5}::int, ${true}::boolean, NULL)
    `,
  );

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
    () =>
      withRlsContext(outsider, (tx) =>
        tx.$executeRaw`SELECT submit_challenge(${groupId}::uuid, ${challengeA.id}::uuid, NULL::text)`,
      ),
    "submit_challenge: グループ外は挑戦できない",
  );

  await assertRejects(
    () =>
      withRlsContext(otherGroupAdmin, (tx) =>
        tx.$executeRaw`SELECT submit_challenge(${otherGroupId}::uuid, ${challengeA.id}::uuid, NULL::text)`,
      ),
    "submit_challenge: 別グループのgroup-specificチャレンジには挑戦できない",
  );

  await assertRejects(
    () =>
      withRlsContext(submitter, (tx) =>
        tx.$executeRaw`SELECT submit_challenge(${groupId}::uuid, ${challengeC.id}::uuid, NULL::text)`,
      ),
    "submit_challenge: 証跡必須チャレンジはevidence_path無しで挑戦できない",
  );

  const [attemptC] = await withRlsContext(submitter, (tx) =>
    tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT * FROM submit_challenge(${groupId}::uuid, ${challengeC.id}::uuid, ${"evidence.jpg"}::text)
    `,
  );
  assert(attemptC.status === "pending", "submit_challenge: 証跡付きなら挑戦できる（status=pending）");

  const [attempt1A] = await withRlsContext(submitter, (tx) =>
    tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT * FROM submit_challenge(${groupId}::uuid, ${challengeA.id}::uuid, NULL::text)
    `,
  );
  assert(attempt1A.status === "pending", "submit_challenge: 通常チャレンジに挑戦できる（status=pending）");

  await assertRejects(
    () =>
      withRlsContext(submitter, (tx) =>
        tx.$executeRaw`SELECT submit_challenge(${groupId}::uuid, ${challengeA.id}::uuid, NULL::text)`,
      ),
    "submit_challenge: 同じチャレンジにpending中の挑戦がある間は再挑戦できない",
  );

  const [attempt1B] = await withRlsContext(submitter, (tx) =>
    tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT * FROM submit_challenge(${groupId}::uuid, ${challengeB.id}::uuid, NULL::text)
    `,
  );
  assert(attempt1B.status === "pending", "submit_challenge: cooldown付きチャレンジにも初回は挑戦できる");

  // --- 読み取り: pendingキュー（承認前の時点で確認） ---
  const pendingAttempts = await withRlsContext(reviewer, (tx) =>
    tx.challengeAttempt.findMany({ where: { groupId, status: "pending" } }),
  );
  assert(pendingAttempts.length === 3, "getGroupChallengeAttempts相当: pending中の挑戦が3件見える");

  // --- approve_challenge ---
  await assertRejects(
    () =>
      withRlsContext(submitter, (tx) =>
        tx.$executeRaw`SELECT approve_challenge(${attempt1A.id}::uuid, 'approved'::approval_decision)`,
      ),
    "approve_challenge: 自分の挑戦は自分で承認できない",
  );

  await assertRejects(
    () =>
      withRlsContext(outsider, (tx) =>
        tx.$executeRaw`SELECT approve_challenge(${attempt1A.id}::uuid, 'approved'::approval_decision)`,
      ),
    "approve_challenge: グループ外は承認できない",
  );

  const walletBefore = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: submitter } },
  });

  const [approvedA] = await withRlsContext(reviewer, (tx) =>
    tx.$queryRaw<{ status: string; reward_points: number; reviewed_by: string; awarded_ledger_id: string }[]>`
      SELECT * FROM approve_challenge(${attempt1A.id}::uuid, 'approved'::approval_decision)
    `,
  );
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
    () =>
      withRlsContext(reviewer, (tx) =>
        tx.$executeRaw`SELECT approve_challenge(${attempt1A.id}::uuid, 'approved'::approval_decision)`,
      ),
    "approve_challenge: 既にレビュー済みの挑戦は再レビューできない",
  );

  const [rejectedC] = await withRlsContext(reviewer, (tx) =>
    tx.$queryRaw<{ status: string; reward_points: number | null; awarded_ledger_id: string | null }[]>`
      SELECT * FROM approve_challenge(${attemptC.id}::uuid, 'rejected'::approval_decision)
    `,
  );
  assert(rejectedC.status === "rejected", "approve_challenge: 却下するとstatusがrejectedになる");
  assert(rejectedC.awarded_ledger_id === null, "approve_challenge: 却下時はawarded_ledger_idが設定されない");

  const walletAfterC = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: submitter } },
  });
  assert(
    walletAfterC.balance === walletAfterA.balance,
    "approve_challenge: 却下時はwalletのbalanceが変化しない",
  );

  const [approvedB] = await withRlsContext(reviewer, (tx) =>
    tx.$queryRaw<{ status: string }[]>`
      SELECT * FROM approve_challenge(${attempt1B.id}::uuid, 'approved'::approval_decision)
    `,
  );
  assert(approvedB.status === "awarded", "approve_challenge: cooldown付きチャレンジの挑戦も承認できる");

  // --- cooldown（既存挑戦がpendingでなくなった後でも、cooldown中は再挑戦できないことを確認） ---
  await assertRejects(
    () =>
      withRlsContext(submitter, (tx) =>
        tx.$executeRaw`SELECT submit_challenge(${groupId}::uuid, ${challengeB.id}::uuid, NULL::text)`,
      ),
    "submit_challenge: 前回の挑戦がpendingでなくなっていてもcooldown中は再挑戦できない",
  );

  // --- 読み取り: getGroupChallenges相当 ---
  const challengesForMember = await withRlsContext(submitter, (tx) =>
    tx.challenge.findMany({
      where: { status: "active", OR: [{ groupId: null }, { groupId }] },
      orderBy: { createdAt: "asc" },
    }),
  );
  assert(
    challengesForMember.length === 4,
    "getGroupChallenges相当: グループメンバーにはsystem+group-specificの4件が見える",
  );

  const challengesForOutsider = await withRlsContext(outsider, (tx) =>
    tx.challenge.findMany({
      where: { status: "active", OR: [{ groupId: null }, { groupId }] },
      orderBy: { createdAt: "asc" },
    }),
  );
  assert(
    challengesForOutsider.length === 1 && challengesForOutsider[0].id === systemChallenge.id,
    "getGroupChallenges相当: グループ外にはsystem challengeの1件だけ見える（RLS境界）",
  );

  // --- 読み取り: getGroupChallengeAttempts相当（全件・ユーザー絞り込み） ---
  const allAttempts = await withRlsContext(reviewer, (tx) =>
    tx.challengeAttempt.findMany({ where: { groupId } }),
  );
  assert(allAttempts.length === 3, "getGroupChallengeAttempts相当: グループ内の全挑戦が3件見える");

  const submitterAttempts = await withRlsContext(reviewer, (tx) =>
    tx.challengeAttempt.findMany({ where: { groupId, userId: submitter } }),
  );
  assert(
    submitterAttempts.length === 3,
    "getGroupChallengeAttempts相当: userId指定で本人の挑戦だけに絞り込める",
  );

  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
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
