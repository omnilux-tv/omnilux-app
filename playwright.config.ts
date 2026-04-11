import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from '@playwright/test';

if (existsSync('.env')) {
  loadEnvFile();
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
