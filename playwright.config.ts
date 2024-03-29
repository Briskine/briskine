import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:8080'
export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  maxFailures: 1,
  workers: 1,
  reporter: 'line',
  expect: {
    timeout: 10 * 1000,
  },
  use: {
    baseURL: baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],
  webServer: {
    command: 'npx http-server ./playwright',
    url: baseURL,
    reuseExistingServer: true,
  },
})
