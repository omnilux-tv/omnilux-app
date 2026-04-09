import { expect, test } from '@playwright/test';

const opsSiteUrl = process.env.OPS_SITE_URL?.trim() || 'https://ops.omnilux.tv';
const operatorEmail = process.env.OPS_SMOKE_OPERATOR_EMAIL?.trim();
const operatorPassword = process.env.OPS_SMOKE_OPERATOR_PASSWORD?.trim();
const customerEmail = process.env.OPS_SMOKE_CUSTOMER_EMAIL?.trim();
const customerPassword = process.env.OPS_SMOKE_CUSTOMER_PASSWORD?.trim();
const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('ops hosted auth smoke', () => {
  test('operator login lands on the operator dashboard', async ({ page }) => {
    test.skip(!operatorEmail || !operatorPassword, 'Missing operator smoke credentials');

    await page.goto(`${opsSiteUrl}/login`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Sign in to OmniLux Ops' })).toBeVisible();

    await page.getByLabel('Email').fill(operatorEmail!);
    await page.getByLabel('Password').fill(operatorPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(/\/dashboard\/operators(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: 'Operator Access' })).toBeVisible();
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
});
