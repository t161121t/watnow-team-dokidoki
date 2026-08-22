export const secretListTabs = ["mine", "dealer", "collection"] as const;

export type SecretListTab = (typeof secretListTabs)[number];

export function parseSecretListTab(
  value: string | string[] | undefined,
  fallback: SecretListTab = "mine",
): SecretListTab {
  return typeof value === "string" && secretListTabs.includes(value as SecretListTab)
    ? (value as SecretListTab)
    : fallback;
}
