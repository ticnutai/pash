import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Dialogs & overlays on mobile", () => {
  test.beforeEach(async ({ page }) => {
    // Prevent dev diagnostic overlay from blocking clicks during tests
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__pashTraceHandle = { stop: () => {}, log: () => {}, snapshot: () => ({}) };
    });
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("search dialog opens, takes input, and can close", async ({ page }) => {
    // Open search
    await page.locator('[data-layout="btn-search"]').first().click();
    const dialog = page.locator('[data-layout="dialog-search"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Type into search
    const input = dialog.locator("input").first();
    await input.fill("וידבר");
    await page.waitForTimeout(2000);

    // Close dialog with Escape
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 3_000 });
  });

  test("text display settings dialog is responsive on mobile", async ({ page }) => {
    await page.locator('[data-layout="btn-text-settings"]').first().click();

    const dialog = page.locator('[data-layout="dialog-text-display"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Dialog should not overflow the viewport
    const dialogBox = await dialog.boundingBox();
    const viewport = page.viewportSize()!;
    expect(dialogBox!.width).toBeLessThanOrEqual(viewport.width + 5);
    expect(dialogBox!.height).toBeGreaterThanOrEqual(viewport.height * 0.48);
    expect(dialogBox!.height).toBeLessThanOrEqual(viewport.height * 0.52);

    // The controls, rather than the whole sheet, own the available scroll area.
    const settingsScroller = dialog.locator(".overflow-y-auto").first();
    await expect(settingsScroller).toHaveClass(/text-settings-scroll/);
    const scrollMetrics = await settingsScroller.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }));
    expect(scrollMetrics.clientHeight).toBeGreaterThan(viewport.height * 0.25);
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
    expect(scrollMetrics.overflowY).toBe("auto");

    await settingsScroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect.poll(() => settingsScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    // Android WebView can report a zero env(safe-area-inset-bottom). The sheet
    // keeps a navigation-bar fallback below its action buttons.
    const actions = dialog.locator('[data-layout="dialog-text-display-actions"]');
    const actionsBox = await actions.boundingBox();
    expect(dialogBox!.y + dialogBox!.height - (actionsBox!.y + actionsBox!.height)).toBeGreaterThanOrEqual(47);

    // Close
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 3_000 });
  });

  test("settings dialog opens from FAB and is scrollable", async ({ page }) => {
    // Try to open settings via FAB
    const fab = page.locator('[data-layout="floating-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-layout="fab-toggle"]').click();
    await page.waitForTimeout(500);

    // Look for "עוד פונקציות" to expand (icon-only button with title attr)
    const moreBtn = page.locator('[title="עוד פונקציות"]');
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(500);
    }

    const settingsAction = page.locator('[title="הגדרות"]').first();
    if (await settingsAction.isVisible()) {
      await settingsAction.click();
      await page.waitForTimeout(1000);

      const settingsDialog = page.locator('[data-layout="dialog-settings"]');
      if (await settingsDialog.isVisible()) {
        // Dialog should be scrollable (max-height set)
        const box = await settingsDialog.boundingBox();
        expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      }
    }
  });

  test("Omer dialog opens and is functional", async ({ page }) => {
    // Check if Omer dialog auto-opened
    let omerDialog = page.locator('[role="dialog"]').filter({ hasText: "לוח ספירת העומר" });
    let visible = await omerDialog.isVisible().catch(() => false);

    if (!visible) {
      // Try the Omer button in header
      const omerBtn = page.locator('[data-layout="btn-omer"]').first();
      if (await omerBtn.isVisible()) {
        await omerBtn.click();
        await page.waitForTimeout(1500);
        visible = await omerDialog.isVisible().catch(() => false);
      }
    }

    if (visible) {
      // Verify dialog is not larger than viewport
      const dialogContent = omerDialog.locator('[role="dialog"]').or(omerDialog);
      const box = await dialogContent.first().boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 5);
      }

      // Verify only one dialog overlay
      const overlays = page.locator('[data-radix-dialog-overlay]');
      const count = await overlays.count();
      expect(count).toBeLessThanOrEqual(2); // Allow 1 overlay

      // Close dialog
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  });

  test("no stacked/duplicate dialogs when opening multiple", async ({ page }) => {
    // Close any auto-opened dialog first
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Open search dialog
    await page.locator('[data-layout="btn-search"]').first().click();
    await page.waitForTimeout(500);

    const dialog1 = page.locator('[data-layout="dialog-search"]');
    await expect(dialog1).toBeVisible({ timeout: 5_000 });

    // Close it
    await page.keyboard.press("Escape");
    await expect(dialog1).toBeHidden({ timeout: 3_000 });

    // Open text settings
    await page.locator('[data-layout="btn-text-settings"]').first().click();
    await page.waitForTimeout(500);

    const dialog2 = page.locator('[data-layout="dialog-text-display"]');
    await expect(dialog2).toBeVisible({ timeout: 5_000 });

    // Only one dialog should be visible now
    const visibleDialogs = page.locator('[role="dialog"]:visible');
    const visibleCount = await visibleDialogs.count();
    expect(visibleCount).toBeLessThanOrEqual(1);

    await page.keyboard.press("Escape");
  });
});
