import { expect, test } from '@playwright/test';
import { createCloudFunctionFetch } from '../src/lib/cloud-function-fetch';
import { resolveWorkosAccessToken } from '../src/providers/workos-token';
import { getMissingWorkosSessionMessage } from '../src/surfaces/app/lib/auth-callback';
import { getWorkosRedirectCallbackHref } from '../src/surfaces/app/lib/auth-flow';

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
