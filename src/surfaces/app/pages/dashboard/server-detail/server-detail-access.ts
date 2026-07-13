export type ServerDetailActorRole = "owner" | "admin" | "user" | "guest" | null;

export const resolveServerDetailManagementAccess = (input: {
  isOwner: unknown;
  actorRole: unknown;
  canManageAccess: unknown;
}): {
  isOwner: boolean;
  actorRole: ServerDetailActorRole;
  canManageAccess: boolean;
} => {
  const actorRole =
    input.actorRole === "owner" ||
    input.actorRole === "admin" ||
    input.actorRole === "user" ||
    input.actorRole === "guest"
      ? input.actorRole
      : null;
  const isOwner = input.isOwner === true && actorRole === "owner";
  const canManageAccess =
    input.canManageAccess === true &&
    (actorRole === "owner" || actorRole === "admin");

  return { isOwner, actorRole, canManageAccess };
};
