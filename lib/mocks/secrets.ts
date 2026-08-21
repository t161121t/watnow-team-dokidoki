import type { Secret } from "@/lib/types/secret";

export const mockSecrets: Secret[] = [
  {
    id: "secret-1",
    groupId: "night-owls",
    ownerName: "びんび",
    ownerInitials: "BB",
    summary: "サークル合宿でひとりだけ寝なかった本当の理由",
    body:
      "実は翌朝のサプライズを準備するため、みんなが寝たあとに会場を飾り付けていました。バレそうでずっと緊張していました。",
    category: "黒歴史",
    rarity: 4,
    value: 320,
    status: "on_auction",
    viewRole: "owner",
    registeredAtLabel: "2026年8月18日",
    remainingLabel: "残り 18分",
  },
  {
    id: "dealer-1",
    groupId: "night-owls",
    ownerName: "はる",
    ownerInitials: "HR",
    summary: "高校時代、毎朝ひそかに続けていたこと",
    body:
      "ディーラーには秘密の本文を表示しません。落札者だけが読むことができます。",
    category: "特技",
    rarity: 3,
    value: 240,
    status: "listed",
    viewRole: "dealer",
    registeredAtLabel: "2026年8月19日",
    remainingLabel: "承認待ち",
  },
  {
    id: "secret-3",
    groupId: "night-owls",
    ownerName: "びんび",
    ownerInitials: "BB",
    summary: "実はずっと練習している意外な趣味",
    body:
      "誰にも言っていませんでしたが、半年ほど前からジャグリングを練習しています。今は三つなら安定して回せます。",
    category: "趣味",
    rarity: 2,
    value: 180,
    status: "registered",
    viewRole: "owner",
    registeredAtLabel: "2026年8月16日",
  },
  {
    id: "won-1",
    groupId: "night-owls",
    ownerName: "みお",
    ownerInitials: "MO",
    summary: "初対面のとき、実は全員を勘違いしていた話",
    body:
      "集合場所を間違えて別の団体に20分ほど混ざっていました。自然に自己紹介まで済ませてから気づきました。",
    category: "黒歴史",
    rarity: 5,
    value: 480,
    status: "sold",
    viewRole: "winner",
    soldPrice: 760,
    registeredAtLabel: "2026年8月10日",
  },
];

export function getSecretsForGroup(groupId: string): Secret[] {
  const groupSecrets = mockSecrets.filter((secret) => secret.groupId === groupId);
  return groupSecrets.length > 0
    ? groupSecrets
    : mockSecrets.map((secret) => ({ ...secret, groupId }));
}

export function getSecret(secretId: string): Secret {
  return mockSecrets.find((secret) => secret.id === secretId) ?? mockSecrets[0];
}
