export const challengeListTabs = ["list", "review"] as const;

export type ChallengeListTab = (typeof challengeListTabs)[number];

export function parseChallengeListTab(
  value: string | string[] | undefined,
  fallback: ChallengeListTab = "list",
): ChallengeListTab {
  return typeof value === "string" && challengeListTabs.includes(value as ChallengeListTab)
    ? (value as ChallengeListTab)
    : fallback;
}
