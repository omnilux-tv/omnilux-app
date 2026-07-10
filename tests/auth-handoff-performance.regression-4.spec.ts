import { expect, test } from '@playwright/test';
import { getAuthHandoffPreconnectLinks } from '../src/lib/auth-handoff';

test('the app preconnects every origin used during the hosted auth handoff', () => {
  const preconnects = getAuthHandoffPreconnectLinks();

  expect(preconnects).toEqual([
    { rel: 'preconnect', href: 'https://login.omnilux.tv' },
    { rel: 'preconnect', href: 'https://auth.omnilux.tv' },
    { rel: 'preconnect', href: 'https://forwarder.workos.com' },
  ]);
});
