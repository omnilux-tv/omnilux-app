import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from '@playwright/test';

if (existsSync('.env')) {
  loadEnvFile();
}

const smokePort = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = process.env.APP_SITE_URL?.trim() || `http://127.0.0.1:${smokePort}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.APP_SITE_URL
    ? undefined
    : {
        command: `pnpm exec vite dev --host 127.0.0.1 --port ${smokePort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'local-smoke-anon-key',
          VITE_MARKETING_SITE_URL: process.env.VITE_MARKETING_SITE_URL ?? 'http://127.0.0.1:4174',
          VITE_APP_SITE_URL: process.env.VITE_APP_SITE_URL ?? baseURL,
          VITE_OPS_SITE_URL: process.env.VITE_OPS_SITE_URL ?? 'http://127.0.0.1:4176',
          CI: process.env.CI ?? '1',
        },
      },
});
