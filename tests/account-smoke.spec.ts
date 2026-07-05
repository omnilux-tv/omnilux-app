import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const appSiteUrl = process.env.APP_SITE_URL?.trim() ?? "";
const workosHostedAuthUrlPattern = /(?:auth|login)\.omnilux\.tv/;
const isProductionApp = appSiteUrl.includes("app.omnilux.tv");
const authEntryWaitUntil = isProductionApp ? "domcontentloaded" : "networkidle";
const missingWorkosConfigHeading =
  "OmniLux Cloud authentication is not configured";

const expectMissingWorkosConfig = async (page: Page) => {
  await expect(page.getByRole("alert")).toContainText("Configuration error");
  await expect(
    page.getByRole("heading", { name: missingWorkosConfigHeading })
  ).toBeVisible();
  await expect(
    page.getByText(
      "VITE_WORKOS_CLIENT_ID is required for OmniLux Cloud authentication."
    )
  ).toBeVisible();
};

const expectWorkosAuthFlow = async (
  page: Page,
  {
    returnTo,
    heading = /sign in/i,
  }: {
    returnTo: string;
    heading?: RegExp;
  }
) => {
  await expect(page).toHaveURL(workosHostedAuthUrlPattern, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: heading })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();

  const currentUrl = new URL(page.url());
  expect(currentUrl.searchParams.get("redirect_uri")).toBe(
    "https://app.omnilux.tv/auth/callback"
  );
  expect(
    JSON.parse(currentUrl.searchParams.get("state") ?? "{}")
  ).toMatchObject({ returnTo });
};

test.describe("account smoke", () => {
  test("production login starts the WorkOS AuthKit flow", async ({ page }) => {
    test.skip(
      !isProductionApp,
      "Production WorkOS handoff smoke only runs against app.omnilux.tv"
    );

    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expectWorkosAuthFlow(page, { returnTo: "/dashboard" });
  });

  test("root route enters the account flow or fails closed when auth config is missing", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: authEntryWaitUntil });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: "/dashboard" });
      return;
    }

    await expectMissingWorkosConfig(page);
    await expect(page.getByText("Error 404")).toHaveCount(0);
  });

  test("login and register entry points render the account auth shell", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: authEntryWaitUntil });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: "/dashboard" });

      await page.goto("/register", { waitUntil: authEntryWaitUntil });
      await expectWorkosAuthFlow(page, {
        returnTo: "/dashboard",
        heading: /sign up/i,
      });
      return;
    }

    await expectMissingWorkosConfig(page);

    await page.goto("/register", { waitUntil: "networkidle" });
    await expectMissingWorkosConfig(page);
  });

  test("billing route protects unauthenticated users before showing billing state", async ({
    page,
  }) => {
    await page.goto("/dashboard/subscription", {
      waitUntil: authEntryWaitUntil,
    });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, { returnTo: "/dashboard/subscription" });
      return;
    }

    await expectMissingWorkosConfig(page);
  });

  test("claim flow protects unauthenticated users before showing claim state", async ({
    page,
  }) => {
    await page.goto("/dashboard/claim?code=abc123", {
      waitUntil: authEntryWaitUntil,
    });

    if (isProductionApp) {
      await expectWorkosAuthFlow(page, {
        returnTo: "/dashboard/claim?code=abc123",
      });
      return;
    }

    await expectMissingWorkosConfig(page);
  });
});
