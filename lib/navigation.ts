import {
  Gavel,
  Heart,
  Home,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export function getGroupNavigation(groupId: string): NavigationItem[] {
  return [
    { key: "home", label: "ホーム", href: `/groups/${groupId}`, icon: Home },
    {
      key: "secrets",
      label: "秘密リスト",
      href: `/groups/${groupId}/secrets?tab=mine`,
      icon: Heart,
    },
    {
      key: "challenges",
      label: "チャレンジ",
      href: `/groups/${groupId}/challenges`,
      icon: Sparkles,
    },
    {
      key: "auctions",
      label: "オークション",
      href: `/groups/${groupId}/auctions`,
      icon: Gavel,
    },
    {
      key: "me",
      label: "マイページ",
      href: `/groups/${groupId}/me`,
      icon: UserRound,
    },
  ];
}
