export type WorkosAccessTokenReader = (options?: { forceRefresh?: boolean }) => Promise<string>;

interface ResolveWorkosAccessTokenOptions {
  attempts?: number;
  fallbackAccessToken?: string | null;
  retryDelayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
}

const defaultWait = (delayMs: number) => new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));

export const resolveWorkosAccessToken = async (
  getAccessToken: WorkosAccessTokenReader,
  {
    attempts = 8,
    fallbackAccessToken = null,
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

  return fallbackAccessToken;
};
