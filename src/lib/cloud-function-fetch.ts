export type CloudAccessTokenProvider = () => Promise<string | null>;

interface CloudFunctionFetchOptions {
  fetch: typeof fetch;
  getCloudAccessTokenProvider: () => CloudAccessTokenProvider | null;
  fallbackAuthorizationHeader?: string | null;
}

const requestUrlFor = (input: Parameters<typeof fetch>[0]) => (
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
);

const requestHeadersFor = (
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
) => new Headers(init?.headers ?? (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));

export const createCloudFunctionFetch = ({
  fetch: originFetch,
  getCloudAccessTokenProvider,
  fallbackAuthorizationHeader = null,
}: CloudFunctionFetchOptions): typeof fetch => async (input, init) => {
  const needsCloudAuth = requestUrlFor(input).includes('/functions/v1/');
  const provider = needsCloudAuth ? getCloudAccessTokenProvider() : null;
  const accessToken = provider ? await provider() : null;
  const headers = requestHeadersFor(input, init);
  const authorization = headers.get('Authorization');
  const hasNonFallbackAuthorization = !!authorization && authorization !== fallbackAuthorizationHeader;

  if (needsCloudAuth && !accessToken && !hasNonFallbackAuthorization) {
    throw new Error('Cloud access token is not available yet.');
  }

  if (!accessToken) {
    return originFetch(input, init);
  }

  headers.set('Authorization', `Bearer ${accessToken}`);

  return originFetch(input, {
    ...init,
    headers,
  });
};
