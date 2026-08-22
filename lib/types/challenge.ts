export type ChallengeTone = "pink" | "blue" | "violet";

export type Challenge = {
  id: string;
  title: string;
  description: string;
  instruction: string;
  reward: number;
  attemptsLabel: string;
  tone: ChallengeTone;
};
