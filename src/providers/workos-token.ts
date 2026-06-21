export type WorkosAccessTokenReader = (options?: { forceRefresh?: boolean }) => Promise<string>;

interface ResolveWorkosAccessTokenOptions {
  attempts?: number;
  fallbackAccessToken?: string | null;
  fallbackExpirySkewMs?: number;
  retryDelayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
}

const defaultWait = (delayMs: number) => new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));

const decodeBase64UrlJson = (value: string): unknown => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
  return JSON.parse(atob(padded));
};

const isFallbackAccessTokenUsable = (
  accessToken: string | null,
  expirySkewMs: number,
  now = Date.now(),
): accessToken is string => {
  if (!accessToken) {
    return false;
  }

  const [, payload] = accessToken.split('.');
  if (!payload) {
    return true;
  }

  try {
    const claims = decodeBase64UrlJson(payload) as { exp?: unknown };
    if (typeof claims.exp !== 'number') {
      return true;
    }

    return claims.exp * 1000 > now + expirySkewMs;
  } catch {
    return true;
  }
};

export const resolveWorkosAccessToken = async (
  getAccessToken: WorkosAccessTokenReader,
  {
    attempts = 8,
    fallbackAccessToken = null,
    fallbackExpirySkewMs = 30_000,
    retryDelayMs = 250,
    wait = defaultWait,
  }: ResolveWorkosAccessTokenOptions = {},
): Promise<string | null> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const forceRefresh = attempt > 0;

    try {
      const accessToken = await getAccessToken(forceRefresh ? { forceRefresh: true } : undefined);
      if (accessToken) {
        return accessToken;
      }
    } catch {
      // AuthKit can briefly expose a user before the callback token exchange is readable.
    }

    if (attempt < attempts - 1) {
      await wait(retryDelayMs * (attempt + 1));
    }
  }

  return isFallbackAccessTokenUsable(fallbackAccessToken, fallbackExpirySkewMs)
    ? fallbackAccessToken
    : null;
};
