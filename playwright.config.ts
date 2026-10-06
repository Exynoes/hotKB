import { defineConfig } from '@playwright/test';

/** TEST-02 — tests de bout en bout. Le serveur (Next + API + Socket.IO) est lancé en production. */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4000',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run start -w server',
    url: 'http://localhost:4000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: { NODE_ENV: 'production' },
  },
});
