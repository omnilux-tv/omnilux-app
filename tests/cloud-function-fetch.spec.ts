import { expect, test } from '@playwright/test';
import { createCloudFunctionFetch } from '../src/lib/cloud-function-fetch';
import { isWorkosSessionPending } from '../src/providers/workos-session-state';
import { resolveWorkosAccessToken } from '../src/providers/workos-token';
import { getMissingWorkosSessionMessage } from '../src/surfaces/app/lib/auth-callback';
import { getWorkosRedirectCallbackHref } from '../src/surfaces/app/lib/auth-flow';
import { getCustomerDashboardRedirect } from '../src/surfaces/app/lib/dashboard-routing';
import { shouldRetryAccessProfileQuery } from '../src/surfaces/app/lib/access-profile-retry';
import { establishManagedMediaSession } from '../src/surfaces/app/lib/managed-media-launch';

test('cloud function fetch fails closed when the WorkOS token is not ready', async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response('{}');
    },
    getCloudAccessTokenProvider: () => async () => null,
  });

  await expect(
    fetchWithCloudAuth('https://api.omnilux.tv/functions/v1/get-access-profile'),
  ).rejects.toThrow('Cloud access token is not available yet.');
  expect(calledOrigin).toBe(false);
});

test('cloud function fetch fails closed when WorkOS token provider is not registered yet', async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response('{}');
    },
    getCloudAccessTokenProvider: () => null,
    fallbackAuthorizationHeader: 'Bearer anon-token',
  });

  await expect(
    fetchWithCloudAuth('https://api.omnilux.tv/functions/v1/get-access-profile', {
      headers: { Authorization: 'Bearer anon-token' },
    }),
  ).rejects.toThrow('Cloud access token is not available yet.');
  expect(calledOrigin).toBe(false);
});

test('cloud function fetch fails closed when WorkOS token provider rejects', async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response('{}');
    },
    getCloudAccessTokenProvider: () => async () => {
      throw new Error('No access token available');
    },
  });

  await expect(
    fetchWithCloudAuth('https://api.omnilux.tv/functions/v1/get-access-profile'),
  ).rejects.toThrow('Cloud access token is not available yet.');
  expect(calledOrigin).toBe(false);
});

test('cloud function fetch preserves legacy Supabase user authorization when no WorkOS provider is registered', async () => {
  let authorization: string | null = null;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async (_input, init) => {
      authorization = new Headers(init?.headers).get('Authorization');
      return new Response('{}');
    },
    getCloudAccessTokenProvider: () => null,
    fallbackAuthorizationHeader: 'Bearer anon-token',
  });

  await fetchWithCloudAuth('https://api.omnilux.tv/functions/v1/get-access-profile', {
    headers: { Authorization: 'Bearer supabase-user-token' },
  });

  expect(authorization).toBe('Bearer supabase-user-token');
});

test('cloud function fetch sends the WorkOS bearer token when it is ready', async () => {
  let authorization: string | null = null;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async (_input, init) => {
      authorization = new Headers(init?.headers).get('Authorization');
      return new Response('{}');
    },
    getCloudAccessTokenProvider: () => async () => 'workos-token',
  });

  await fetchWithCloudAuth('https://api.omnilux.tv/functions/v1/get-access-profile', {
    headers: { Authorization: 'Bearer anon-token' },
  });

  expect(authorization).toBe('Bearer workos-token');
});

test('WorkOS token resolution retries transient callback token misses', async () => {
  const calls: Array<{ forceRefresh?: boolean } | undefined> = [];
  const accessToken = await resolveWorkosAccessToken(
    async (options) => {
      calls.push(options);
      if (calls.length < 3) {
        throw new Error('No access token available');
      }
      return 'workos-token';
    },
    {
      retryDelayMs: 1,
      wait: async () => {},
    },
  );

  expect(accessToken).toBe('workos-token');
  expect(calls).toEqual([
    undefined,
    { forceRefresh: true },
    { forceRefresh: true },
  ]);
});

test('WorkOS token resolution keeps retrying through the callback handoff window', async () => {
  const calls: Array<{ forceRefresh?: boolean } | undefined> = [];
  const accessToken = await resolveWorkosAccessToken(
    async (options) => {
      calls.push(options);
      if (calls.length < 8) {
        throw new Error('No access token available');
      }
      return 'workos-token';
    },
    {
      retryDelayMs: 1,
      wait: async () => {},
    },
  );

  expect(accessToken).toBe('workos-token');
  expect(calls).toHaveLength(8);
  expect(calls[0]).toBeUndefined();
  expect(calls.slice(1)).toEqual(Array.from({ length: 7 }, () => ({ forceRefresh: true })));
});

test('WorkOS token resolution keeps a settled session usable through transient token misses', async () => {
  let calls = 0;
  const accessToken = await resolveWorkosAccessToken(
    async () => {
      calls += 1;
      throw new Error('No access token available');
    },
    {
      fallbackAccessToken: 'settled-workos-token',
      retryDelayMs: 1,
      wait: async () => {},
    },
  );

  expect(accessToken).toBe('settled-workos-token');
  expect(calls).toBe(8);
});

test('WorkOS token resolution does not reuse an expired settled session token', async () => {
  let calls = 0;
  const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const expiredAccessToken = `header.${expiredPayload}.signature`;
  const accessToken = await resolveWorkosAccessToken(
    async () => {
      calls += 1;
      throw new Error('No access token available');
    },
    {
      fallbackAccessToken: expiredAccessToken,
      retryDelayMs: 1,
      wait: async () => {},
    },
  );

  expect(accessToken).toBeNull();
  expect(calls).toBe(8);
});

test('WorkOS callback reports a failed session instead of spinning forever', () => {
  expect(getMissingWorkosSessionMessage({
    loading: false,
    provider: 'workos',
    hasSession: false,
  })).toBe('Authentication session could not be established. Request a new sign-in link and try again.');

  expect(getMissingWorkosSessionMessage({
    loading: true,
    provider: 'workos',
    hasSession: false,
  })).toBeNull();

  expect(getMissingWorkosSessionMessage({
    loading: false,
    provider: 'supabase_auth',
    hasSession: false,
  })).toBeNull();
});

test('WorkOS auth stays loading while a user is waiting on a token-backed session', () => {
  expect(isWorkosSessionPending({
    isAuthKitLoading: false,
    tokenLoading: false,
    hasWorkosUser: true,
    hasSession: false,
    tokenAttemptSettled: false,
  })).toBe(true);

  expect(isWorkosSessionPending({
    isAuthKitLoading: false,
    tokenLoading: false,
    hasWorkosUser: true,
    hasSession: false,
    tokenAttemptSettled: true,
  })).toBe(false);
});

test('WorkOS redirect callback stays on the app surface', () => {
  expect(getWorkosRedirectCallbackHref(
    { returnTo: '/dashboard/billing?tab=plan' },
    {
      hostname: 'app.omnilux.tv',
      origin: 'https://app.omnilux.tv',
      protocol: 'https:',
      port: '',
    },
  )).toBe('https://app.omnilux.tv/dashboard/billing?tab=plan');

  expect(getWorkosRedirectCallbackHref(
    { returnTo: 'https://evil.example/phish' },
    {
      hostname: 'app.omnilux.tv',
      origin: 'https://app.omnilux.tv',
      protocol: 'https:',
      port: '',
    },
  )).toBe('https://app.omnilux.tv/dashboard');

  expect(getWorkosRedirectCallbackHref(
    { returnTo: '//evil.example/phish' },
    {
      hostname: 'app.omnilux.tv',
      origin: 'https://app.omnilux.tv',
      protocol: 'https:',
      port: '',
    },
  )).toBe('https://app.omnilux.tv/dashboard');
});

test('customer dashboard routes operator profiles to the ops console', () => {
  expect(getCustomerDashboardRedirect(undefined, 'https://ops.omnilux.tv/dashboard')).toBeNull();
  expect(getCustomerDashboardRedirect({ isOperator: false }, 'https://ops.omnilux.tv/dashboard')).toBeNull();
  expect(getCustomerDashboardRedirect({ isOperator: true }, 'https://ops.omnilux.tv/dashboard'))
    .toBe('https://ops.omnilux.tv/dashboard');
});

test('managed media launch exchanges the cloud token for a runtime session before navigation', async () => {
  let requestedUrl = '';
  let requestedAuthorization: string | null = null;
  let requestedCredentials: RequestCredentials | undefined;
  let requestedBody: unknown = null;

  const destination = await establishManagedMediaSession({
    mediaOrigin: 'https://media.omnilux.tv/',
    getAccessToken: async () => 'workos-access-token',
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedAuthorization = new Headers(init?.headers).get('Authorization');
      requestedCredentials = init?.credentials;
      requestedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  expect(destination).toBe('https://media.omnilux.tv/');
  expect(requestedUrl).toBe('https://media.omnilux.tv/api/auth/cloud-login');
  expect(requestedAuthorization).toBe('Bearer workos-access-token');
  expect(requestedCredentials).toBe('include');
  expect(requestedBody).toEqual({ deviceType: 'browser', deviceName: 'OmniLux Cloud App' });
});

test('managed media launch rejects untrusted origins before reading the cloud token', async () => {
  let readToken = false;
  let calledFetch = false;

  await expect(establishManagedMediaSession({
    mediaOrigin: 'https://media.attacker.example/',
    getAccessToken: async () => {
      readToken = true;
      return 'workos-access-token';
    },
    fetch: async () => {
      calledFetch = true;
      return new Response('{}');
    },
  })).rejects.toThrow('OmniLux Media can only be opened through media.omnilux.tv.');

  expect(readToken).toBe(false);
  expect(calledFetch).toBe(false);
});

test('managed media launch maps runtime session failures to media wording', async () => {
  await expect(establishManagedMediaSession({
    mediaOrigin: 'https://media.omnilux.tv/',
    getAccessToken: async () => 'workos-access-token',
    fetch: async () => new Response(JSON.stringify({ error: 'session rejected' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }),
  })).rejects.toThrow('session rejected');

  await expect(establishManagedMediaSession({
    mediaOrigin: 'https://media.omnilux.tv/',
    getAccessToken: async () => 'workos-access-token',
    fetch: async () => new Response('{}', { status: 500 }),
  })).rejects.toThrow('OmniLux Media could not start a session for this account.');
});

test('access profile query does not retry authorization failures', () => {
  expect(shouldRetryAccessProfileQuery(0, { status: 401 })).toBe(false);
  expect(shouldRetryAccessProfileQuery(0, { context: { status: 403 } })).toBe(false);
  expect(shouldRetryAccessProfileQuery(0, new Error('temporary outage'))).toBe(true);
  expect(shouldRetryAccessProfileQuery(1, new Error('temporary outage'))).toBe(false);
});
