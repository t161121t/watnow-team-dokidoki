export type NavigationItem = {
  key: string;
  label: string;
  href: string;
};

export function getGroupNavigation(groupId: string): NavigationItem[] {
  return [
    { key: "home", label: "ホーム", href: `/groups/${groupId}` },
    {
      key: "secrets",
      label: "秘密リスト",
      href: `/groups/${groupId}/secrets`,
    },
    {
      key: "challenges",
      label: "チャレンジ",
      href: `/groups/${groupId}/challenges`,
    },
    {
      key: "auctions",
      label: "オークション",
      href: `/groups/${groupId}/auctions`,
    },
    { key: "me", label: "マイページ", href: `/groups/${groupId}/me` },
  ];
}
