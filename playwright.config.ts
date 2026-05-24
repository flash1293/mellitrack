import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'

// Detect if running on Alpine Linux (musl) vs glibc-based Linux
// Alpine needs to use the system Chromium since Playwright's bundled
// Chromium is compiled against glibc and won't run on musl.
const isAlpine = fs.existsSync('/etc/alpine-release')

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ...(isAlpine ? {
      launchOptions: {
        executablePath: '/usr/bin/chromium',
      },
    } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npx tsx scripts/local-dev.ts',
      url: 'http://localhost:8787/api/auth/check',
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
    {
      command: 'vite --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
  ],
})
