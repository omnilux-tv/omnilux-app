interface EstablishManagedMediaSessionInput {
  mediaOrigin: string;
  getAccessToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

const TRUSTED_MANAGED_MEDIA_ORIGIN = 'https://media.omnilux.tv';

const normalizeMediaOrigin = (mediaOrigin: string): string => {
  const url = new URL(mediaOrigin);
  if (url.origin !== TRUSTED_MANAGED_MEDIA_ORIGIN) {
    throw new Error('OmniLux Media can only be opened through media.omnilux.tv.');
  }
  return new URL('/', url.origin).toString();
};

export const establishManagedMediaSession = async ({
  mediaOrigin,
  getAccessToken,
  fetch: fetchImpl = fetch,
}: EstablishManagedMediaSessionInput): Promise<string> => {
  const destination = normalizeMediaOrigin(mediaOrigin);
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Sign in again before opening OmniLux Media.');
  }

  const response = await fetchImpl(new URL('/api/auth/cloud-login', destination).toString(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceType: 'browser',
      deviceName: 'OmniLux Cloud App',
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'OmniLux Media could not start a session for this account.',
    );
  }

  return destination;
};
