export type CloudAccessTokenProvider = () => Promise<string | null>;

interface CloudFunctionFetchOptions {
  fetch: typeof fetch;
  getCloudAccessTokenProvider: () => CloudAccessTokenProvider | null;
  fallbackAuthorizationHeader?: string | null;
  allowAuthorizationHeaderFallback?: boolean;
}

const requestUrlFor = (input: Parameters<typeof fetch>[0]) =>
  typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

const requestHeadersFor = (
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1]
) =>
  new Headers(
    init?.headers ??
      (typeof input !== "string" && !(input instanceof URL)
        ? input.headers
        : undefined)
  );

export const createCloudFunctionFetch =
  ({
    fetch: originFetch,
    getCloudAccessTokenProvider,
    fallbackAuthorizationHeader = null,
    allowAuthorizationHeaderFallback = false,
  }: CloudFunctionFetchOptions): typeof fetch =>
  async (input, init) => {
    const needsCloudAuth = requestUrlFor(input).includes("/functions/v1/");
    const provider = needsCloudAuth ? getCloudAccessTokenProvider() : null;
    let accessToken: string | null = null;
    if (provider) {
      try {
        accessToken = await provider();
      } catch {
        accessToken = null;
      }
    }
    const headers = requestHeadersFor(input, init);
    const authorization = headers.get("Authorization");
    const hasAllowedAuthorizationFallback =
      allowAuthorizationHeaderFallback &&
      !!authorization &&
      authorization !== fallbackAuthorizationHeader;

    if (needsCloudAuth && !accessToken && !hasAllowedAuthorizationFallback) {
      throw new Error("Cloud access token is not available yet.");
    }

    if (!accessToken) {
      return originFetch(input, init);
    }

    headers.set("Authorization", `Bearer ${accessToken}`);

    return originFetch(input, {
      ...init,
      headers,
    });
  };
