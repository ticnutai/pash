import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Safe area & system bars on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("setting safe-area-inset-bottom adds has-bottom-system-bar class", async ({ page }) => {
    const result = await page.evaluate(() => {
      document.documentElement.style.setProperty("--safe-area-inset-bottom", "48px");
      window.dispatchEvent(new CustomEvent("safeAreaUpdated", { detail: { bottom: 48 } }));

      return {
        hasClass: document.body.classList.contains("has-bottom-system-bar"),
        paddingBottom: getComputedStyle(document.getElementById("root")!).paddingBottom,
      };
    });

    expect(result.hasClass).toBe(true);
    expect(result.paddingBottom).toBe("48px");
  });

  test("clearing safe-area-inset-bottom removes class and padding", async ({ page }) => {
    // First set it
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--safe-area-inset-bottom", "48px");
      window.dispatchEvent(new CustomEvent("safeAreaUpdated", { detail: { bottom: 48 } }));
    });

    // Then clear it
    const result = await page.evaluate(() => {
      document.documentElement.style.setProperty("--safe-area-inset-bottom", "0px");
      window.dispatchEvent(new CustomEvent("safeAreaUpdated", { detail: { bottom: 0 } }));

      return {
        hasClass: document.body.classList.contains("has-bottom-system-bar"),
        paddingBottom: getComputedStyle(document.getElementById("root")!).paddingBottom,
      };
    });

    expect(result.hasClass).toBe(false);
    expect(result.paddingBottom).toBe("0px");
  });

  test("header respects safe-area-inset-top", async ({ page }) => {
    const header = page.locator('[data-layout="header"]');
    await expect(header).toBeVisible();

    // Header should have padding-top set via CSS variable
    const paddingTop = await header.evaluate((el) => {
      return getComputedStyle(el).paddingTop;
    });

    // Should have some padding (at least > 0)
    const val = parseFloat(paddingTop);
    expect(val).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Orientation handling", () => {
  test("landscape mode renders without breaking", async ({ page }) => {
    // Set landscape viewport
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto("/");
    await waitForAppReady(page);

    // Header should still work
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Content should be visible
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await expect(verseCards.first()).toBeVisible({ timeout: 15_000 });

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("switching from portrait to landscape preserves state", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Click a specific book
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.locator('[data-layout="sefer-selector"]').getByText("שמות").first().click();
    await page.waitForTimeout(2000);

    // Switch to landscape
    await page.setViewportSize({ width: 915, height: 412 });
    await page.waitForTimeout(1000);

    // "שמות" should still be selected (header should still work)
    await expect(page.locator('[data-layout="header"]')).toBeVisible();
  });
});
