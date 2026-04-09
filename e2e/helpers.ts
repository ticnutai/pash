import { test, expect, Page } from "@playwright/test";

/**
 * Wait for the main app to finish its initial loading spinner
 */
async function waitForAppReady(page: Page) {
  // Wait for #root to exist
  await page.waitForSelector("#root", { timeout: 15_000 });
  // Wait for the loading spinner to disappear
  await expect(page.locator(".animate-spin").first()).toBeHidden({ timeout: 20_000 });
  // Wait for the header to be visible (signals content loaded)
  await expect(page.locator('[data-layout="header"]')).toBeVisible({ timeout: 15_000 });
}

export { waitForAppReady };
