import { defineConfig, devices } from '@playwright/test'
const baseURL = 'http://127.0.0.1:4173'
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: 3,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
