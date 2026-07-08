export const CLAIM_CODE_LENGTH = 6;

export const normalizeClaimCodeInput = (value: string): string[] =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CLAIM_CODE_LENGTH)
    .split("");

export const applyClaimCodeInput = (
  currentCode: string[],
  startIndex: number,
  value: string
): string[] => {
  const normalized = normalizeClaimCodeInput(value).slice(
    0,
    CLAIM_CODE_LENGTH - startIndex
  );
  if (normalized.length === 0) {
    return currentCode;
  }

  const next = [...currentCode];
  normalized.forEach((char, offset) => {
    next[startIndex + offset] = char;
  });
  return next;
};
