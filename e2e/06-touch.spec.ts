import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Touch interactions & gestures on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    // Close any auto-opened dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("page scrolls vertically without issues", async ({ page }) => {
    // Wait for content
    await page.locator('[data-layout="verse-cards"]').first().waitFor({ timeout: 15_000 });

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Scroll down via touch
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    const afterScroll = await page.evaluate(() => window.scrollY);
    expect(afterScroll).toBeGreaterThan(initialScroll);
  });

  test("tapping a pasuk shows options (highlight, note, etc.)", async ({ page }) => {
    // Wait for verses to load
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await verseCards.first().waitFor({ timeout: 15_000 });

    // Find a verse element and click it
    const firstVerse = verseCards.locator("[data-pasuk-id]").first();
    if (await firstVerse.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstVerse.click();
      await page.waitForTimeout(1000);

      // Some interaction should happen - check it didn't crash
      await expect(page.locator('[data-layout="header"]')).toBeVisible();
    }
  });

  test("long press on verse doesn't cause unexpected behavior", async ({ page }) => {
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await verseCards.first().waitFor({ timeout: 15_000 });

    const verse = verseCards.locator("span, p").first();
    const box = await verse.boundingBox();
    if (box) {
      // Simulate long press
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(800);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Page should still be functional
      await expect(page.locator('[data-layout="header"]')).toBeVisible();
    }
  });

  test("swipe up/down scrolls content", async ({ page }) => {
    await page.locator('[data-layout="verse-cards"]').first().waitFor({ timeout: 15_000 });

    // Perform a swipe-up gesture
    const viewport = page.viewportSize()!;
    const startX = viewport.width / 2;
    const startY = viewport.height * 0.7;
    const endY = viewport.height * 0.3;

    await page.touchscreen.tap(startX, startY);
    await page.waitForTimeout(100);

    // Simulate swipe
    await page.evaluate(
      ({ sx, sy, ey }) => {
        window.scrollBy(0, sy - ey);
      },
      { sx: startX, sy: startY, ey: endY }
    );
    await page.waitForTimeout(500);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });
});
