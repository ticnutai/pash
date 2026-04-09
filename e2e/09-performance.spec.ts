import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Performance & stability on mobile", () => {
  test("initial load completes within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(10_000);
    console.log(`Initial load time: ${elapsed}ms`);
  });

  test("no console errors on initial load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known non-critical errors
        if (
          !text.includes("favicon") &&
          !text.includes("service-worker") &&
          !text.includes("push-sw") &&
          !text.includes("Failed to load resource: net::ERR_")
        ) {
          errors.push(text);
        }
      }
    });

    await page.goto("/");
    await waitForAppReady(page);
    await page.waitForTimeout(3000);

    if (errors.length > 0) {
      console.log("Console errors:", errors);
    }
    expect(errors.length).toBe(0);
  });

  test("no uncaught JavaScript exceptions", async ({ page }) => {
    const exceptions: string[] = [];
    page.on("pageerror", (error) => {
      exceptions.push(error.message);
    });

    await page.goto("/");
    await waitForAppReady(page);

    // Do some interactions
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Navigate a bit
    const shemotBtn = page.locator('[data-layout="sefer-selector"]').getByText("שמות").first();
    if (await shemotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await shemotBtn.click();
      await page.waitForTimeout(2000);
    }

    if (exceptions.length > 0) {
      console.log("Uncaught exceptions:", exceptions);
    }
    expect(exceptions.length).toBe(0);
  });

  test("switching sefarim multiple times stays stable", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const books = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
    const selector = page.locator('[data-layout="sefer-selector"]');

    for (let i = 0; i < 3; i++) {
      for (const book of books) {
        const btn = selector.getByText(book).first();
        if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(800);
        }
      }
    }

    // App should still be in a good state
    await expect(page.locator('[data-layout="header"]')).toBeVisible();
    await expect(page.locator('[data-layout="verse-cards"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test("opening and closing dialogs rapidly doesn't crash", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    for (let i = 0; i < 5; i++) {
      // Open search
      await page.locator('[data-layout="btn-search"]').first().click();
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Open text settings
      await page.locator('[data-layout="btn-text-settings"]').first().click();
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // App should still work
    await expect(page.locator('[data-layout="header"]')).toBeVisible();
  });

  test("memory doesn't leak after navigation cycles", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // Do navigation cycles
    const books = ["שמות", "ויקרא", "במדבר", "דברים", "בראשית"];
    const selectorMem = page.locator('[data-layout="sefer-selector"]');
    for (const book of books) {
      const btn = selectorMem.getByText(book).first();
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const growthMB = (finalMemory - initialMemory) / (1024 * 1024);
      console.log(`Memory growth: ${growthMB.toFixed(2)} MB`);
      // Should not grow more than 50MB after navigation
      expect(growthMB).toBeLessThan(50);
    }
  });
});
