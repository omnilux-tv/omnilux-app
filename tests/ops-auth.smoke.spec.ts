import { Page, expect, test } from '@playwright/test';

const opsSiteUrl = process.env.OPS_SITE_URL?.trim() || 'https://ops.omnilux.tv';
const appSiteUrl = process.env.APP_SITE_URL?.trim() || 'https://app.omnilux.tv';
const operatorEmail = process.env.OPS_SMOKE_OPERATOR_EMAIL?.trim();
const operatorPassword = process.env.OPS_SMOKE_OPERATOR_PASSWORD?.trim();
const customerEmail = process.env.OPS_SMOKE_CUSTOMER_EMAIL?.trim();
const customerPassword = process.env.OPS_SMOKE_CUSTOMER_PASSWORD?.trim();
const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loginOperator = async (page: Page) => {
  await page.goto(`${opsSiteUrl}/login`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Ops' })).toBeVisible();

  await page.getByLabel('Email').fill(operatorEmail!);
  await page.getByLabel('Password').fill(operatorPassword!);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test.describe('ops hosted auth smoke', () => {
  test('operator login lands on the operator dashboard', async ({ page }) => {
    test.skip(!operatorEmail || !operatorPassword, 'Missing operator smoke credentials');

    await loginOperator(page);

    await page.waitForURL(/\/dashboard(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: 'Operate OmniLux from a single command surface.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Service watchlist' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent operator activity' })).toBeVisible();
  });

  test('rescue deep-link preserves an authenticated operator session', async ({ page }) => {
    test.skip(!operatorEmail || !operatorPassword, 'Missing operator smoke credentials');

    await loginOperator(page);
    await page.waitForURL(/\/dashboard(?:\?.*)?$/);

    await page.goto(`${opsSiteUrl}/dashboard/rescue?lookup=demo@example.com`, { waitUntil: 'networkidle' });
    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard/rescue')) {
      await expect(page.getByRole('heading', { name: 'One route to classify and safely resolve a customer access failure.' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Customer lookup' })).toBeVisible();
      await expect(page.getByText('Start here with user id, email, or display name.')).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(new RegExp(`${escapeForRegex(opsSiteUrl)}/dashboard(?:\\?.*)?$`));
    await expect(page.getByRole('heading', { name: 'Operate OmniLux from a single command surface.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'OmniLux Ops home' })).toBeVisible();
  });

  test('non-operator accounts are blocked from the ops surface', async ({ page }) => {
    test.skip(!customerEmail || !customerPassword, 'Missing customer smoke credentials');

    await page.goto(`${opsSiteUrl}/login`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Ops' })).toBeVisible();

    await page.getByLabel('Email').fill(customerEmail!);
    await page.getByLabel('Password').fill(customerPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByText('This account does not have operator access. Use an internal operator account for OmniLux Ops.'),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${escapeForRegex(opsSiteUrl)}/login(?:\\?.*)?$`));
  });

  test('customer cloud app shows managed media and hides operator-only surfaces', async ({ page }) => {
    test.skip(!customerEmail || !customerPassword, 'Missing customer smoke credentials');

    await page.goto(`${appSiteUrl}/login`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Cloud' })).toBeVisible();

    await page.getByLabel('Email').fill(customerEmail!);
    await page.getByLabel('Password').fill(customerPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(/\/dashboard(?:\?.*)?$/);
    await page.goto(`${appSiteUrl}/dashboard/servers`, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Cloud-Linked Servers' })).toBeVisible();
    await expect(page.getByRole('link', { name: /OmniLux Media/i })).toBeVisible();
    await expect(page.getByText('OmniLux Ops')).toHaveCount(0);

    await page.goto(`${appSiteUrl}/dashboard/media`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'OmniLux Media' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open OmniLux Media' })).toBeVisible();
  });
});
