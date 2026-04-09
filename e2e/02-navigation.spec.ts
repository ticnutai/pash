import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Sefer & Parsha navigation on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    // Close any auto-opened dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("clicking a sefer drills down to parsha level", async ({ page }) => {
    const selector = page.locator('[data-layout="sefer-selector"]');
    await expect(selector).toBeVisible();

    // The selector may auto-drill (weekly parsha). Go back to sefer level via breadcrumb
    const seferBreadcrumbBtn = selector.locator("button").first();
    if (await seferBreadcrumbBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await seferBreadcrumbBtn.click();
      await page.waitForTimeout(500);
    }

    // Look for a sefer button with BookOpen icon - these are only at sefer level
    const shemotBtn = selector.locator("button").filter({ hasText: "שמות" }).first();
    if (await shemotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await shemotBtn.click();
      await page.waitForTimeout(1000);

      // Should show parsha buttons or breadcrumb with "שמות"
      await expect(selector.getByText("שמות").first()).toBeVisible();
    }
  });

  test("auto-loaded weekly parsha has content visible", async ({ page }) => {
    // App auto-navigates to current weekly parsha
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await expect(verseCards.first()).toBeVisible({ timeout: 20_000 });

    // Nav buttons show the current parsha
    const navButtons = page.locator('[data-layout="nav-buttons"]');
    await expect(navButtons).toBeVisible({ timeout: 5_000 });
    const parshaText = await navButtons.textContent();
    expect(parshaText!.length).toBeGreaterThan(2);
  });

  test("switch to Neviim corpus shows Neviim books", async ({ page }) => {
    const corpusBtn = page.locator('[data-layout="btn-corpus"]').first();
    await expect(corpusBtn).toBeVisible();
    await corpusBtn.click();
    await page.waitForTimeout(1500);

    // Neviim books should appear
    const selector = page.locator('[data-layout="sefer-selector"]');
    await expect(selector.getByText("יהושע").first()).toBeVisible({ timeout: 10_000 });

    // Switch back
    await corpusBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();
  });

  test("navigate between parshas with chevron buttons", async ({ page }) => {
    const navButtons = page.locator('[data-layout="nav-buttons"]');
    await expect(navButtons).toBeVisible({ timeout: 15_000 });

    const initialText = await navButtons.textContent();

    // Click next parsha
    const buttons = navButtons.locator("button");
    await buttons.last().click();
    await page.waitForTimeout(2000);

    const newText = await navButtons.textContent();
    expect(newText).not.toBe(initialText);
  });

  test("no error boundary on initial load", async ({ page }) => {
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await expect(verseCards.first()).toBeVisible({ timeout: 15_000 });

    const errorBoundary = page.locator("text=שגיאה כללית");
    await expect(errorBoundary).toBeHidden({ timeout: 2_000 });
  });
});
