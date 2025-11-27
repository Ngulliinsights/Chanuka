import { defineConfig, devices } from '@playwright/test';

/**
 * Root Playwright Configuration
 * Handles E2E tests with proper separation from Vitest
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Test file patterns - ONLY .spec.{ts,tsx} files for Playwright */
  testMatch: '**/*.spec.{ts,tsx}',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    /* API Testing Project */
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://127.0.0.1:4200',
      },
    },
    /* Database Performance Testing */
    {
      name: 'database-performance',
      testDir: './tests/api',
      testMatch: '**/database-performance.spec.ts',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:4200/api',
      },
    },
    /* Integration Testing */
    {
      name: 'integration',
      testDir: './tests/integration',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:4200/api',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.PW_DISABLE_WEB_SERVER === '1' ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',

  /* Test timeout */
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  /* Output directories */
  outputDir: 'test-results/',
});





































