import type { Challenge } from "@/lib/types/challenge";

export const mockChallenges: Challenge[] = [
  {
    id: "daily-quiz",
    title: "秘密の三択クイズ",
    description: "グループの出来事を当ててポイントを獲得",
    instruction: "グループのメンバーに電話して、会話のスクショを残そう。",
    reward: 30,
    attemptsLabel: "本日あと1回",
    tone: "pink",
  },
  {
    id: "personality",
    title: "こっそり心理テスト",
    description: "直感で答える5つの質問",
    instruction: "心理テストを受けて、結果画面を撮影して提出しよう。",
    reward: 20,
    attemptsLabel: "未挑戦",
    tone: "violet",
  },
  {
    id: "speed",
    title: "10秒クイッククイズ",
    description: "時間切れになる前に答えよう",
    instruction: "クイズに勝った画面を撮影して提出しよう。",
    reward: 15,
    attemptsLabel: "本日あと2回",
    tone: "blue",
  },
];

export function getChallenge(challengeId: string): Challenge {
  return (
    mockChallenges.find((challenge) => challenge.id === challengeId) ??
    mockChallenges[0]
  );
}

export function getNextChallengeId(challengeId: string): string {
  const index = mockChallenges.findIndex((challenge) => challenge.id === challengeId);
  const current = index >= 0 ? index : 0;
  return mockChallenges[(current + 1) % mockChallenges.length].id;
}
