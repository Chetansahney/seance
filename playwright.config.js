// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: '**/*.spec.js',
  timeout: 60_000,
  use: {
    channel: 'msedge',
    headless: true,
    baseURL: 'http://localhost:3666',
  },
  projects: [
    {
      name: 'msedge',
      use: { channel: 'msedge' },
    },
  ],
  // No webServer here — the test itself manages the server lifecycle.
});
