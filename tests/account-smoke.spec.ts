import { expect, test } from '@playwright/test';

test.describe('account smoke', () => {
  test('root route enters the account flow instead of rendering not found', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard');

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    await expect(page.getByText('Error 404')).toHaveCount(0);
  });

  test('login and register entry points render the account auth shell', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
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
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard/subscription');

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/dashboard/subscription');
  });

  test('claim flow redirects unauthenticated users back to login with the full claim target preserved', async ({ page }) => {
    await page.goto('/dashboard/claim?code=abc123', { waitUntil: 'networkidle' });
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard/claim?code=abc123');

    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/dashboard/claim?code=abc123');
  });
});
