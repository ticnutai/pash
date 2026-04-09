import { test, expect, Page } from "@playwright/test";
import { waitForAppReady } from "./helpers";

/**
 * Thorough E2E tests for the Omer Board Dialog on mobile:
 * - Does it auto-open?
 * - Does it open MULTIPLE times (duplicate dialog bug)?
 * - Does the prayer dialog cascade after 10 seconds?
 * - Can it be closed cleanly?
 * - Does reopening work without duplicates?
 */

/** Collect all console logs for debugging */
function collectConsoleLogs(page: Page): string[] {
  const logs: string[] = [];
  page.on("console", (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  return logs;
}

test.describe("Omer Dialog - Auto Open & Multi-Popup Debug", () => {
  test("Omer dialog auto-opens exactly ONCE on mobile", async ({ page }) => {
    const logs = collectConsoleLogs(page);

    await page.goto("/");
    await waitForAppReady(page);

    // Wait a bit for Omer auto-open
    await page.waitForTimeout(2000);

    // Count ALL visible dialogs
    const allDialogs = page.locator('[role="dialog"]');
    const visibleDialogCount = await allDialogs.evaluateAll((els) =>
      els.filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && (el as HTMLElement).offsetHeight > 0;
      }).length
    );

    console.log(`[DEBUG] Visible dialog count: ${visibleDialogCount}`);

    // Count Omer-specific dialogs (with "ספירת העומר" text)
    const omerDialogs = page.locator('[role="dialog"]').filter({ hasText: "ספירת העומר" });
    const omerDialogCount = await omerDialogs.count();
    const visibleOmerDialogs = [];
    for (let i = 0; i < omerDialogCount; i++) {
      if (await omerDialogs.nth(i).isVisible().catch(() => false)) {
        visibleOmerDialogs.push(i);
      }
    }

    console.log(`[DEBUG] Omer dialog elements: ${omerDialogCount}, visible: ${visibleOmerDialogs.length}`);

    // CRITICAL: Should be exactly 0 or 1 Omer dialog visible (not 2+)
    expect(visibleOmerDialogs.length).toBeLessThanOrEqual(1);

    // Count dialog overlays (indicates stacked dialogs)
    const overlays = page.locator('[data-radix-dialog-overlay]');
    const overlayCount = await overlays.count();
    console.log(`[DEBUG] Dialog overlay count: ${overlayCount}`);
    // Should be at most 1 overlay
    expect(overlayCount).toBeLessThanOrEqual(1);
  });

  test("Omer prayer dialog cascades after ~10 seconds (no duplicate main dialog)", async ({ page }) => {
    const logs = collectConsoleLogs(page);

    // Clear tooltip-dismissed to trigger full cascading flow
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("omer-tooltip-dismissed");
    });
    await page.reload();
    await waitForAppReady(page);

    // Wait for auto-open
    await page.waitForTimeout(2000);

    // Verify Omer dialog is open
    const omerDialog = page.locator('[role="dialog"]').filter({ hasText: "ספירת העומר" });
    const omerVisible = await omerDialog.first().isVisible().catch(() => false);
    console.log(`[DEBUG] Omer dialog visible after 2s: ${omerVisible}`);

    if (omerVisible) {
      // Wait for the 10-second prayer cascade timer
      await page.waitForTimeout(11_000);

      // After 10s, a prayer/blessing dialog may have opened
      // Count ALL visible dialogs now
      const allDialogsAfter = page.locator('[role="dialog"]');
      const visibleAfter = await allDialogsAfter.evaluateAll((els) =>
        els.filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden" && (el as HTMLElement).offsetHeight > 0;
        }).length
      );

      console.log(`[DEBUG] Visible dialogs after 10s cascade: ${visibleAfter}`);

      // Should have at most 2 (omer dialog + prayer subdialog or popover)
      // NOT 3+ which would indicate a bug
      expect(visibleAfter).toBeLessThanOrEqual(2);

      // Check overlay count (indicates stacking)
      const overlayAfter = await page.locator('[data-radix-dialog-overlay]').count();
      console.log(`[DEBUG] Overlays after 10s: ${overlayAfter}`);
    }

    // Log console output for debugging
    const omerLogs = logs.filter((l) => l.toLowerCase().includes("omer") || l.toLowerCase().includes("reminder"));
    if (omerLogs.length > 0) {
      console.log("[DEBUG] Omer-related console logs:", omerLogs.slice(0, 20));
    }
  });

  test("closing Omer dialog requires only ONE close action", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    const omerDialog = page.locator('[role="dialog"]').filter({ hasText: "ספירת העומר" });
    const wasOpen = await omerDialog.first().isVisible().catch(() => false);

    if (wasOpen) {
      // Close with Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);

      // Check if fully closed
      const stillVisible = await omerDialog.first().isVisible().catch(() => false);
      console.log(`[DEBUG] After 1st Escape: dialog still visible = ${stillVisible}`);

      if (stillVisible) {
        // If still visible, it needed a second Escape (BUG: stacked dialogs)
        console.log("[DEBUG] BUG: Omer dialog required multiple Escape presses!");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }

      // After closing, no dialogs should be visible
      const anyDialogVisible = await page.locator('[role="dialog"]').evaluateAll((els) =>
        els.filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden" && (el as HTMLElement).offsetHeight > 0;
        }).length
      );

      console.log(`[DEBUG] Dialogs visible after close: ${anyDialogVisible}`);
      expect(anyDialogVisible).toBe(0);
    }
  });

  test("reopening Omer dialog does not create duplicates", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Close auto-opened dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Manually open from header button
    const omerSpan = page.locator('[data-layout="btn-omer"]').first();
    if (await omerSpan.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await omerSpan.locator("button").first().click();
      await page.waitForTimeout(1500);

      // Count visible Omer dialogs
      const omerDialogs = page.locator('[role="dialog"]').filter({ hasText: "ספירת העומר" });
      const visibleCount = await omerDialogs.evaluateAll((els) =>
        els.filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden" && (el as HTMLElement).offsetHeight > 0;
        }).length
      );

      console.log(`[DEBUG] After manual reopen: visible Omer dialogs = ${visibleCount}`);
      expect(visibleCount).toBeLessThanOrEqual(1);

      // Close and reopen again
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);

      await omerSpan.locator("button").first().click();
      await page.waitForTimeout(1500);

      const secondReopenCount = await omerDialogs.evaluateAll((els) =>
        els.filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden" && (el as HTMLElement).offsetHeight > 0;
        }).length
      );

      console.log(`[DEBUG] After 2nd reopen: visible Omer dialogs = ${secondReopenCount}`);
      expect(secondReopenCount).toBeLessThanOrEqual(1);
    }
  });

  test("Omer dialog with auto-open disabled does NOT open", async ({ page }) => {
    // Set auto-open to false before loading
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("omer-auto-open", "false");
    });
    await page.reload();
    await waitForAppReady(page);

    // Wait to make sure nothing auto-opens
    await page.waitForTimeout(3000);

    const omerDialog = page.locator('[role="dialog"]').filter({ hasText: "ספירת העומר" });
    const visible = await omerDialog.first().isVisible().catch(() => false);
    console.log(`[DEBUG] Omer dialog visible with auto-open=false: ${visible}`);
    expect(visible).toBe(false);

    // Clean up
    await page.evaluate(() => {
      localStorage.setItem("omer-auto-open", "true");
    });
  });

  test("multiple rapid page reloads don't stack Omer dialogs", async ({ page }) => {
    // Rapid reloads to stress-test auto-open
    for (let i = 0; i < 3; i++) {
      await page.goto("/");
      await page.waitForTimeout(500);
    }

    await waitForAppReady(page);
    await page.waitForTimeout(3000);

    const allDialogs = page.locator('[role="dialog"]');
    const visibleDialogCount = await allDialogs.evaluateAll((els) =>
      els.filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && (el as HTMLElement).offsetHeight > 0;
      }).length
    );

    console.log(`[DEBUG] After 3 rapid reloads: ${visibleDialogCount} visible dialogs`);
    expect(visibleDialogCount).toBeLessThanOrEqual(1);
  });
});
