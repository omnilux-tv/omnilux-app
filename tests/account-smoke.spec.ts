import { expect, test } from '@playwright/test';

test.describe('account smoke', () => {
  test('login and register entry points render the hosted auth shell', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Sign in to your OmniLux account' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();

    await page.goto('/register', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Create your OmniLux account' })).toBeVisible();
    await expect(page.getByLabel('Display name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByText('I agree to the Terms of Service')).toBeVisible();
  });

  test('billing route redirects unauthenticated users back to login with the destination preserved', async ({ page }) => {
    await page.goto('/dashboard/subscription', { waitUntil: 'networkidle' });
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard/subscription');

    await expect(page.getByRole('heading', { name: 'Sign in to your OmniLux account' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/dashboard/subscription');
  });

  test('claim flow redirects unauthenticated users back to login with the full claim target preserved', async ({ page }) => {
    await page.goto('/dashboard/claim?code=abc123', { waitUntil: 'networkidle' });
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/dashboard/claim?code=abc123');

    await expect(page.getByRole('heading', { name: 'Sign in to your OmniLux account' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/dashboard/claim?code=abc123');
  });
});
