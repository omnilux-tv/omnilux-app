export type CloudAccessTokenProvider = () => Promise<string | null>;

export interface CloudRuntimeSessionBridgeInput {
  runtimeOrigin: string;
  trustedOrigin: string;
  getAccessToken: CloudAccessTokenProvider;
  fetch?: typeof fetch;
  deviceType?: string;
  deviceName?: string;
}

export interface CloudRuntimeSessionBridge {
  destination: string;
  accessToken: string;
}

export interface RuntimeJsonRequestInput {
  bridge: CloudRuntimeSessionBridge;
  path: string;
  body: unknown;
  fetch?: typeof fetch;
  errorMessage: string;
}

export function normalizeTrustedRuntimeOrigin(runtimeOrigin: string, trustedOrigin: string): string {
  const runtimeUrl = new URL(runtimeOrigin);
  const trustedUrl = new URL(trustedOrigin);
  if (runtimeUrl.origin !== trustedUrl.origin) {
    throw new Error(`This runtime can only be opened through ${trustedUrl.hostname}.`);
  }
  return new URL('/', runtimeUrl.origin).toString();
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof payload?.error === 'string' ? payload.error : fallback;
}

export async function establishCloudRuntimeSession({
  runtimeOrigin,
  trustedOrigin,
  getAccessToken,
  fetch: fetchImpl = fetch,
  deviceType = 'browser',
  deviceName = 'OmniLux Cloud App',
}: CloudRuntimeSessionBridgeInput): Promise<CloudRuntimeSessionBridge> {
  const destination = normalizeTrustedRuntimeOrigin(runtimeOrigin, trustedOrigin);
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Sign in again before opening this OmniLux runtime.');
  }

  const response = await fetchImpl(new URL('/api/auth/cloud-login', destination).toString(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceType,
      deviceName,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'OmniLux could not start a runtime session for this account.'));
  }

  return { destination, accessToken };
}

export async function postRuntimeJson<TResponse>({
  bridge,
  path,
  body,
  fetch: fetchImpl = fetch,
  errorMessage,
}: RuntimeJsonRequestInput): Promise<TResponse> {
  const response = await fetchImpl(new URL(path, bridge.destination).toString(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${bridge.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, errorMessage));
  }

  return response.json() as Promise<TResponse>;
}
