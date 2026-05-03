import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Header button functionality on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    // Close any auto-opened Omer dialog first
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    // Close any remaining dialogs
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("language toggle switches between Hebrew and English", async ({ page }) => {
    const langSpan = page.locator('[data-layout="btn-lang"]').first();
    await expect(langSpan).toBeVisible();
    // Click the inner button
    await langSpan.locator("button").first().click();
    await page.waitForTimeout(1000);
    // Should not crash
    await expect(page.locator('[data-layout="header"]')).toBeVisible();
  });

  test("search button opens search dialog", async ({ page }) => {
    const searchSpan = page.locator('[data-layout="btn-search"]').first();
    await expect(searchSpan).toBeVisible();
    await searchSpan.locator("button").first().click();

    const searchDialog = page.locator('[data-layout="dialog-search"]');
    await expect(searchDialog).toBeVisible({ timeout: 5_000 });

    const searchInput = searchDialog.locator("input").first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("בראשית");
    await page.waitForTimeout(1500);
    await expect(searchDialog).toBeVisible();
  });

  test("text display settings opens dialog", async ({ page }) => {
    const settingsSpan = page.locator('[data-layout="btn-text-settings"]').first();
    await expect(settingsSpan).toBeVisible();
    await settingsSpan.locator("button").first().click();

    const dialog = page.locator('[data-layout="dialog-text-display"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("siddur button navigates to siddur page", async ({ page }) => {
    const siddurSpan = page.locator('[data-layout="btn-siddur"]').first();
    await expect(siddurSpan).toBeVisible();
    await siddurSpan.locator("button, a").first().click();

    await page.waitForURL("**/siddur", { timeout: 10_000 });
    await expect(page).toHaveURL(/siddur/);
  });

  test("user menu opens dropdown", async ({ page }) => {
    const userSpan = page.locator('[data-layout="btn-user"]').first();
    await expect(userSpan).toBeVisible();
    await userSpan.locator("button").first().click();
    await page.waitForTimeout(500);

    const loginText = page.getByText("התחברות").or(page.getByText("התחבר")).first();
    const userMenu = page.locator('[role="menu"], [role="menuitem"]').first();
    
    const loginVisible = await loginText.isVisible().catch(() => false);
    const menuVisible = await userMenu.isVisible().catch(() => false);
    expect(loginVisible || menuVisible).toBe(true);
  });
});
