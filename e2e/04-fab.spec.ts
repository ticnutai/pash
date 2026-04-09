import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("FAB (Floating Action Button) on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("FAB is visible and positioned within viewport", async ({ page }) => {
    const fab = page.locator('[data-layout="floating-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });

    const box = await fab.boundingBox();
    expect(box).toBeTruthy();
    
    const viewport = page.viewportSize()!;
    // FAB should be within viewport bounds
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 10);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 10);
  });

  test("FAB expands and shows action buttons on click", async ({ page }) => {
    const fab = page.locator('[data-layout="floating-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });

    // Click the FAB main button
    const mainBtn = fab.locator("button").first();
    await mainBtn.click();
    await page.waitForTimeout(500);

    // Should show action labels like "בחירה מהירה", "חיפוש", "עוד פונקציות"
    const navAction = page.getByText("בחירה מהירה");
    const searchAction = page.getByText("חיפוש");
    
    const navVisible = await navAction.isVisible().catch(() => false);
    const searchVisible = await searchAction.isVisible().catch(() => false);
    expect(navVisible || searchVisible).toBe(true);
  });

  test("FAB search opens search dialog", async ({ page }) => {
    const fab = page.locator('[data-layout="floating-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });

    // Open FAB
    await fab.locator("button").first().click();
    await page.waitForTimeout(500);

    // Click search action
    const searchAction = page.getByText("חיפוש").first();
    if (await searchAction.isVisible()) {
      await searchAction.click();
      await page.waitForTimeout(1000);

      // Search dialog or search input should appear
      const searchDialog = page.locator('[data-layout="dialog-search"]');
      const searchInput = page.locator('[data-search-dialog-input]');
      const dialogVisible = await searchDialog.isVisible().catch(() => false);
      const inputVisible = await searchInput.isVisible().catch(() => false);
      expect(dialogVisible || inputVisible).toBe(true);
    }
  });

  test("FAB doesn't overlap header or get cut off", async ({ page }) => {
    const fab = page.locator('[data-layout="floating-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });
    const fabBox = await fab.boundingBox();

    const header = page.locator('[data-layout="header"]');
    const headerBox = await header.boundingBox();

    // FAB should be below the header
    expect(fabBox!.y).toBeGreaterThan(headerBox!.y + headerBox!.height - 10);
  });
});
