const claimErrorCopy = [
  {
    pattern: /claim code has expired/i,
    message:
      "This claim code expired. Generate a new code on the local OmniLux server, then enter it here.",
  },
  {
    pattern: /server already claimed by another account/i,
    message:
      "This server belongs to another OmniLux account. Sign in with that owner account or ask the owner to remove the link.",
  },
  {
    pattern: /already used or expired/i,
    message:
      "This claim code was already used or expired. Generate a new code on the local server before retrying.",
  },
  {
    pattern: /invalid claim code/i,
    message:
      "This claim code is not valid. Compare all six characters with the code shown on the local server.",
  },
  {
    pattern: /unauthor|sign in|access token/i,
    message:
      "Your account session is not authorized to claim this server. Sign in again, then retry with a fresh code.",
  },
  {
    pattern: /failed to fetch|network|unavailable/i,
    message:
      "The claim service is unavailable. Your local server is unaffected; wait a moment and retry this account-linking step.",
  },
] as const;

export const getClaimServerErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    claimErrorCopy.find(({ pattern }) => pattern.test(message))?.message ??
    "The server could not be attached. Confirm the local server is running, generate a fresh code, and retry."
  );
};
