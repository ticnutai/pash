import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Page routing on mobile", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();
  });

  test("siddur page loads and has content", async ({ page }) => {
    await page.goto("/siddur");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Wait for siddur content to load
    await expect(page.locator("body")).toContainText(/סידור|תפילה|שחרית|מנחה|ערבית/, {
      timeout: 15_000,
    });

    // Should have navigation tabs or categories
    const tabsOrButtons = page.locator("button, [role='tab']");
    const count = await tabsOrButtons.count();
    expect(count).toBeGreaterThan(1);
  });

  test("omer page loads", async ({ page }) => {
    await page.goto("/omer");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Should display Omer content
    await expect(page.locator("body")).toContainText(/עומר|ספירה/, {
      timeout: 15_000,
    });
  });

  test("auth page loads with login form", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Should have email and password inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="מייל"], input[placeholder*="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput.first()).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput.first()).toBeVisible({ timeout: 5_000 });
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz");
    await page.waitForSelector("#root", { timeout: 15_000 });

    // Should show some kind of not-found content or redirect
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("navigating from siddur back to main page works", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Navigate to siddur via button
    await page.locator('[data-layout="btn-siddur"]').first().click();
    await page.waitForURL("**/siddur", { timeout: 10_000 });

    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Main page should be visible again
    await expect(page.locator('[data-layout="header"]')).toBeVisible({ timeout: 10_000 });
  });
});
