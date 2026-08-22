"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import {
  AVATAR_EXTENSIONS,
  createAvatarUploadUrl,
} from "@/lib/supabase/storage";
import { createGroup as createGroupInDb } from "@/features/groups/server/create-group";
import { getMyGroups as getMyGroupsInDb } from "@/features/groups/server/get-my-groups";
import { createInviteLink as createInviteLinkInDb } from "@/features/groups/server/create-invite-link";
import { revokeInviteLink as revokeInviteLinkInDb } from "@/features/groups/server/revoke-invite-link";
import { joinViaInviteLink as joinViaInviteLinkInDb } from "@/features/groups/server/join-via-invite-link";
import { getInviteLink as getInviteLinkInDb } from "@/features/groups/server/get-invite-link";
import { leaveGroup as leaveGroupInDb } from "@/features/groups/server/leave-group";
import { updateGroupMemberRole as updateGroupMemberRoleInDb } from "@/features/groups/server/update-group-member-role";
import { kickGroupMember as kickGroupMemberInDb } from "@/features/groups/server/kick-group-member";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("ログインが必要です");
  }
}

const iconUploadSchema = z.object({
  extension: z.enum(AVATAR_EXTENSIONS),
});

/**
 * グループ作成（④）でのアイコン画像アップロード用に、署名付きアップロードURLを
 * 発行する。UI側は返り値の`signedUrl`に画像ファイルを直接PUTし、その`path`を
 * createGroupの`iconPath`に渡す想定。
 *
 * avatarsバケットをuser avatarと共用している（prisma/sql/common/004_avatars_storage.sql）。
 * pathは呼び出しユーザー自身のフォルダ固定（RLSの制約）で、グループとの紐付けは
 * まだ存在しないグループのidではなく、アップロード者のuserIdで行う。
 */
export async function createGroupIconUploadUrl(input: { extension: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = iconUploadSchema.parse(input);
  return createAvatarUploadUrl(userId, parsed.extension);
}

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(50),
  iconPath: z.string().optional(),
});

/**
 * グループ作成（④）。作成者は自動でactive adminになり、walletが初期化される
 * （create_group RPC参照）。
 */
export async function createGroup(input: { name: string; iconPath?: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = createGroupSchema.parse(input);
  return createGroupInDb(userId, parsed.name, parsed.iconPath ?? null);
}

/**
 * 本人が所属するactiveなgroupの一覧。ログイン直後の遷移先判定
 * （app/auth/callback/route.ts。所属ありならホーム⑥、未所属なら
 * 参加/作成へ、docs/画面.md §2）に使う。
 */
export async function getMyGroups() {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  return getMyGroupsInDb(userId);
}

const groupIdSchema = z.object({ groupId: z.string().uuid() });

/**
 * グループ管理（⑤）での招待URL発行/再発行（issue #71）。既存リンクがある場合は
 * コードを再発行し、旧リンクは自動的に無効化される（create_group_invite_link
 * RPCのupsert）。admin確認はRPC側が行う。
 */
export async function createGroupInviteLink(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = groupIdSchema.parse(input);
  return createInviteLinkInDb(userId, parsed.groupId);
}

/** グループ管理（⑤）での招待URL取り消し。admin確認はRPC側が行う。 */
export async function revokeGroupInviteLink(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = groupIdSchema.parse(input);
  return revokeInviteLinkInDb(userId, parsed.groupId);
}

/** グループ管理（⑤）で現在有効な招待URLのコードを取得する。 */
export async function getInviteLink(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = groupIdSchema.parse(input);
  return getInviteLinkInDb(userId, parsed.groupId);
}

const joinViaInviteLinkSchema = z.object({ code: z.string().min(1) });

/**
 * 招待URLでのグループ参加（issue #71）。新規参加・再参加のいずれもRPC
 * （join_group_via_invite_link）側で処理する。
 */
export async function joinGroupViaInviteLink(input: { code: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = joinViaInviteLinkSchema.parse(input);
  return joinViaInviteLinkInDb(userId, parsed.code);
}

/**
 * グループ脱退。進行中オークションに関与中（出品者/ディーラー/入札者）の場合や、
 * 最後のadminの場合はleave_group RPC側が拒否する。
 */
export async function leaveGroup(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = groupIdSchema.parse(input);
  return leaveGroupInDb(userId, parsed.groupId);
}

const updateGroupMemberRoleSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["member", "admin"]),
});

/**
 * グループ管理（⑤）でのメンバー役割変更。最後のadminをmemberに降格することは
 * update_group_member_role RPC側が拒否する。
 */
export async function updateGroupMemberRole(input: {
  groupId: string;
  userId: string;
  role: "member" | "admin";
}) {
  const currentUserId = await getCurrentUserId();
  requireUserId(currentUserId);

  const parsed = updateGroupMemberRoleSchema.parse(input);
  return updateGroupMemberRoleInDb(
    currentUserId,
    parsed.groupId,
    parsed.userId,
    parsed.role,
  );
}

const groupMemberIdSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * グループ管理（⑤）でのメンバーkick。進行中オークションに関与中の場合や
 * 最後のadminの場合はkick_group_member RPC側が拒否する。
 */
export async function kickGroupMember(input: { groupId: string; userId: string }) {
  const currentUserId = await getCurrentUserId();
  requireUserId(currentUserId);

  const parsed = groupMemberIdSchema.parse(input);
  return kickGroupMemberInDb(currentUserId, parsed.groupId, parsed.userId);
}
