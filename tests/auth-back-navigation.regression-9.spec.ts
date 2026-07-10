import { expect, test } from '@playwright/test';
import {
  navigateToWorkosAuthorization,
  validateWorkosAuthorizationUrl,
} from '../src/providers/auth-provider/workos-auth-navigation';

const request = {
  state: { returnTo: '/dashboard/subscription' },
  loginHint: 'viewer@example.com',
};
const config = {
  apiHostname: 'auth.omnilux.tv',
  clientId: 'client_test',
  redirectUri: 'https://app.omnilux.tv/auth/callback',
};

const getGeneratedUrl = (overrides: Record<string, string> = {}) => {
  const destination = new URL('https://auth.omnilux.tv/user_management/authorize');
  const parameters = {
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    provider: 'authkit',
    code_challenge_method: 'S256',
    code_challenge: 'A'.repeat(43),
    state: JSON.stringify(request.state),
    login_hint: request.loginHint,
    ...overrides,
  };

  for (const [name, value] of Object.entries(parameters)) {
    destination.searchParams.set(name, value);
  }

  return destination.toString();
};

test('hosted auth navigation waits for AuthKit, preserves its PKCE URL, and replaces app history', async () => {
  let generated = false;
  let replacedWith: string | null = null;

  const getAuthorizationUrl = async () => {
    generated = true;
    return getGeneratedUrl();
  };

  await expect(
    navigateToWorkosAuthorization({
      ready: false,
      getAuthorizationUrl,
      request,
      config,
      replaceLocation: (url) => {
        replacedWith = url;
      },
    }),
  ).resolves.toBe(false);
  expect(generated).toBe(false);

  await expect(
    navigateToWorkosAuthorization({
      ready: true,
      getAuthorizationUrl,
      request,
      config,
      replaceLocation: (url) => {
        replacedWith = url;
      },
    }),
  ).resolves.toBe(true);
  expect(generated).toBe(true);
  expect(replacedWith).toBe(getGeneratedUrl());
});

test('hosted auth navigation rejects provider URLs with a different origin or invalid PKCE state', () => {
  expect(() =>
    validateWorkosAuthorizationUrl(
      getGeneratedUrl().replace(
        'https://auth.omnilux.tv',
        'https://attacker.example',
      ),
      request,
      config,
    ),
  ).toThrow('unsafe authorization URL');

  expect(() =>
    validateWorkosAuthorizationUrl(
      getGeneratedUrl({ code_challenge: 'not-pkce' }),
      request,
      config,
    ),
  ).toThrow('unsafe authorization URL');
});
