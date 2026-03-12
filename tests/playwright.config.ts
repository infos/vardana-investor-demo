import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/results/playwright-report.json' }],
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npx vercel dev --listen 3001',
    url: 'http://localhost:3001',
    timeout: 60_000,
    reuseExistingServer: true,
    cwd: '..',
    stdout: 'pipe',
    stderr: 'pipe',
  },

  projects: [
    // ── API Tests (no browser needed, just fetch) ──
    {
      name: 'api-tests',
      testDir: './api',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── E2E: Chromium (primary) ──
    {
      name: 'chromium',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },

    // ── E2E: Firefox ──
    {
      name: 'firefox',
      testDir: './e2e',
      testMatch: ['01-dashboard.spec.ts', '02-patient-detail.spec.ts', '03-voice-setup.spec.ts'],
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },

    // ── E2E: WebKit (Safari) ──
    {
      name: 'webkit',
      testDir: './e2e',
      testMatch: ['01-dashboard.spec.ts', '02-patient-detail.spec.ts', '03-voice-setup.spec.ts'],
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },

    // ── Device: iPad Pro ──
    {
      name: 'ipad-pro',
      testDir: './responsive',
      use: { ...devices['iPad Pro 11'] },
    },

    // ── Device: iPhone 14 ──
    {
      name: 'iphone-14',
      testDir: './responsive',
      use: { ...devices['iPhone 14'] },
    },

    // ── Device: Pixel 7 ──
    {
      name: 'pixel-7',
      testDir: './responsive',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
