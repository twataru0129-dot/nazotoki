import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  // CI では報告書（HTML）も残す。再試行はしない（不安定なテストを隠さない）
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/nazotoki/',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/nazotoki/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'iphone-se', use: { ...devices['iPhone SE'], browserName: 'chromium', viewport: { width: 375, height: 667 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    // 第6段階の総合テスト（final.spec.ts）だけを、端末サイズを広げて実行する
    {
      name: 'small-phone',
      testMatch: /final\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    },
    {
      name: 'iphone-14',
      testMatch: /final\.spec\.ts/,
      use: { ...devices['iPhone 14'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
    {
      name: 'ipad',
      testMatch: /final\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    },
  ],
});
