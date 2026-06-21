import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const appSiteUrl = process.env.APP_SITE_URL?.trim() ?? '';
const workosHostedAuthUrlPattern = /(?:auth|login)\.omnilux\.tv/;
const isProductionApp = appSiteUrl.includes('app.omnilux.tv');
const authEntryWaitUntil = isProductionApp ? 'domcontentloaded' : 'networkidle';

const expectWorkosAuthFlow = async (
  page: Page,
  {
    returnTo,
    heading = /sign in/i,
  }: {
    returnTo: string;
    heading?: RegExp;
  },
) => {
  await expect(page).toHaveURL(workosHostedAuthUrlPattern, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();

  const currentUrl = new URL(page.url());
  expect(currentUrl.searchParams.get('redirect_uri')).toBe('https://app.omnilux.tv/auth/callback');
  expect(JSON.parse(currentUrl.searchParams.get('state') ?? '{}')).toMatchObject({ returnTo });
};

test.describe('account smoke', () => {
  test('production login starts the WorkOS AuthKit flow', async ({ page }) => {
    test.skip(!isProductionApp, 'Production WorkOS handoff smoke only runs against app.omnilux.tv');

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expectWorkosAuthFlow(page, { returnTo: '/dashboard' });
  });

  test('root route enters the account flow instead of rendering not found', async ({ page }) => {
    await page.goto('/', { waitUntil: authEntryWaitUntil });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: '/dashboard' });
      return;
    }

    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard');

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    await expect(page.getByText('Error 404')).toHaveCount(0);
  });

  test('login and register entry points render the account auth shell', async ({ page }) => {
    await page.goto('/login', { waitUntil: authEntryWaitUntil });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: '/dashboard' });

      await page.goto('/register', { waitUntil: authEntryWaitUntil });
      await expectWorkosAuthFlow(page, { returnTo: '/dashboard', heading: /sign up/i });
      return;
    }

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    await expect(page.getByText('Continuing through the account sign-in flow configured for this environment.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue to dashboard' })).toBeVisible();

    await page.goto('/register', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Create your OmniLux account' })).toBeVisible();
    await expect(page.getByText('Continuing through the account creation flow configured for this environment.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to login' })).toBeVisible();
  });

  test('billing route redirects unauthenticated users back to login with the destination preserved', async ({ page }) => {
    await page.goto('/dashboard/subscription', { waitUntil: 'networkidle' });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: '/dashboard/subscription' });
      return;
    }

    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard/subscription');

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/dashboard/subscription');
  });

  test('claim flow redirects unauthenticated users back to login with the full claim target preserved', async ({ page }) => {
    await page.goto('/dashboard/claim?code=abc123', { waitUntil: 'networkidle' });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: '/dashboard/claim?code=abc123' });
      return;
    }

    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard/claim?code=abc123');

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/dashboard/claim?code=abc123');
  });
});
