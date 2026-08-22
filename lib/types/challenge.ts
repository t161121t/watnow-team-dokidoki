import type { User } from "@/lib/types/user";

export type ChallengeTone = "pink" | "blue" | "violet";

export type Challenge = {
  id: string;
  title: string;
  description: string;
  reward: number;
  attemptsLabel: string;
  tone: ChallengeTone;
};

export type ChallengeApprovalStatus = {
  member: User;
  approved: boolean;
};

export type ActiveChallenge = {
  id: string;
  frequencyLabel: string;
  reward: number;
  approvals: ChallengeApprovalStatus[];
};
