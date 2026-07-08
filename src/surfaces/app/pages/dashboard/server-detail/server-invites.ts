import type { InviteRow } from "./useServerDetail";

export const inviteRoleDescriptions: Record<"user" | "guest", string> = {
  user: "User invites can access the shared server from the cloud account experience.",
  guest:
    "Guest invites are limited-access shares for temporary or lower-trust users.",
};

export const getInviteRoleDescription = (role: string): string =>
  role === "guest" ? inviteRoleDescriptions.guest : inviteRoleDescriptions.user;

export const getInviteUsesRemaining = (
  invite: Pick<InviteRow, "max_uses" | "uses">
): number | null => {
  if (invite.max_uses == null) {
    return null;
  }

  return Math.max(invite.max_uses - invite.uses, 0);
};

export const isInviteExpired = (
  invite: Pick<InviteRow, "expires_at">,
  now = new Date()
): boolean => {
  if (!invite.expires_at) {
    return false;
  }

  return new Date(invite.expires_at).getTime() <= now.getTime();
};

export const isInviteUseLimitReached = (
  invite: Pick<InviteRow, "max_uses" | "uses">
): boolean => {
  const usesRemaining = getInviteUsesRemaining(invite);
  return usesRemaining !== null && usesRemaining <= 0;
};

export const isInviteInactive = (
  invite: Pick<InviteRow, "expires_at" | "max_uses" | "uses">,
  now = new Date()
): boolean => isInviteExpired(invite, now) || isInviteUseLimitReached(invite);

export const getInviteUsageLabel = (
  invite: Pick<InviteRow, "max_uses" | "uses">
): string => {
  const usesRemaining = getInviteUsesRemaining(invite);
  if (usesRemaining === null) {
    return `${invite.uses} used · unlimited uses remaining`;
  }

  return `${invite.uses}/${invite.max_uses} used · ${usesRemaining} ${usesRemaining === 1 ? "use" : "uses"} remaining`;
};

export const formatInviteDate = (value: string | null | undefined): string => {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const getInviteExpiryLabel = (
  invite: Pick<InviteRow, "expires_at">,
  now = new Date()
): string => {
  if (!invite.expires_at) {
    return "No expiry set";
  }

  return isInviteExpired(invite, now)
    ? `Expired ${formatInviteDate(invite.expires_at)}`
    : `Expires ${formatInviteDate(invite.expires_at)}`;
};

export const getInviteStatusLabel = (
  invite: Pick<InviteRow, "expires_at" | "max_uses" | "uses">,
  now = new Date()
): "Active" | "Expired" | "Used up" => {
  if (isInviteExpired(invite, now)) {
    return "Expired";
  }

  if (isInviteUseLimitReached(invite)) {
    return "Used up";
  }

  return "Active";
};
