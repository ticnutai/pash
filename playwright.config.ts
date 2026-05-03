import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:4300",
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "mobile-android",
      use: {
        ...devices["Pixel 7"],
        // Override viewport to match existing test sizes
        viewport: { width: 412, height: 915 },
      },
    },
    {
      name: "mobile-iphone",
      use: {
        ...devices["iPhone 14"],
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:4300",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
