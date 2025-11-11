import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Regression Testing Configuration
 * Specialized configuration for visual regression testing across browsers and viewports
 */
export default defineConfig({
  testDir: './src/__tests__/visual',
  
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'test-results/visual-report' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    
    /* Visual testing specific settings */
    video: 'off', // Disable video for visual tests to reduce noise
  },

  /* Visual regression testing projects */
  projects: [
    {
      name: 'visual-desktop-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'visual-desktop-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'visual-tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'visual-mobile',
      use: { 
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Visual testing specific settings */
  expect: {
    /* Threshold for visual comparisons */
    threshold: 0.2,
    /* Animation handling */
    animations: 'disabled',
  },

  timeout: 60 * 1000, // Longer timeout for visual tests
});