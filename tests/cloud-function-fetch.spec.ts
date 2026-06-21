import { expect, test } from '@playwright/test';
import { createCloudFunctionFetch } from '../src/lib/cloud-function-fetch';

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
