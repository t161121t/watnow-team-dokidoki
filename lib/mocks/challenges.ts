import { mockMemberships } from "@/lib/mocks/groups";
import type { ActiveChallenge, Challenge } from "@/lib/types/challenge";

export const mockChallenges: Challenge[] = [
  {
    id: "daily-quiz",
    title: "秘密の三択クイズ",
    description: "グループの出来事を当ててポイントを獲得",
    reward: 30,
    attemptsLabel: "本日あと1回",
    tone: "pink",
  },
  {
    id: "personality",
    title: "こっそり心理テスト",
    description: "直感で答える5つの質問",
    reward: 20,
    attemptsLabel: "未挑戦",
    tone: "violet",
  },
  {
    id: "speed",
    title: "10秒クイッククイズ",
    description: "時間切れになる前に答えよう",
    reward: 15,
    attemptsLabel: "本日あと2回",
    tone: "blue",
  },
];

export const mockActiveChallenges: ActiveChallenge[] = [
  {
    id: "active-daily-call",
    frequencyLabel: "1日1回チャレンジ",
    reward: 50,
    approvals: mockMemberships.map(({ user }, index) => ({
      member: user,
      approved: index !== 2,
    })),
  },
  {
    id: "active-quick-quiz",
    frequencyLabel: "10秒クイックチャレンジ",
    reward: 15,
    approvals: mockMemberships.map(({ user }, index) => ({
      member: user,
      approved: index < 2,
    })),
  },
];
