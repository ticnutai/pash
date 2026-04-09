import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Main page loads correctly on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("header is visible with mobile action buttons", async ({ page }) => {
    const header = page.locator('[data-layout="header"]');
    await expect(header).toBeVisible();

    // Mobile header actions should be visible
    const mobileActions = page.locator('[data-layout="header-actions-mobile"]');
    await expect(mobileActions).toBeVisible();

    // Desktop header actions should be hidden on mobile
    const desktopActions = page.locator('[data-layout="header-actions-desktop"]');
    await expect(desktopActions).toBeHidden();
  });

  test("all header buttons are rendered and clickable", async ({ page }) => {
    const buttons = [
      "btn-lang",
      "btn-text-settings",
      "btn-selection",
      "btn-search",
      "btn-siddur",
      "btn-corpus",
      "btn-user",
    ];

    for (const btn of buttons) {
      const el = page.locator(`[data-layout="${btn}"]`).first();
      await expect(el).toBeVisible({ timeout: 5_000 });
    }
  });

  test("sefer selector loads with book buttons", async ({ page }) => {
    const selector = page.locator('[data-layout="sefer-selector"]');
    await expect(selector).toBeVisible();

    // At least one Torah book button should be visible (e.g. בראשית)
    const books = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
    for (const book of books) {
      await expect(selector.getByText(book).first()).toBeVisible();
    }
  });

  test("content area loads with pasuk text", async ({ page }) => {
    // Wait for verse cards to appear
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await expect(verseCards.first()).toBeVisible({ timeout: 20_000 });

    // Should have Hebrew text content
    const textContent = await verseCards.first().textContent();
    expect(textContent).toBeTruthy();
    expect(textContent!.length).toBeGreaterThan(10);
  });

  test("mobile controls bar shows on mobile", async ({ page }) => {
    const mobileControls = page.locator('[data-layout="mobile-controls"]');
    await expect(mobileControls).toBeVisible({ timeout: 10_000 });
  });

  test("navigation buttons show with parsha name", async ({ page }) => {
    const navButtons = page.locator('[data-layout="nav-buttons"]');
    await expect(navButtons).toBeVisible({ timeout: 10_000 });

    // Should have prev/next chevron buttons
    const chevronBtns = navButtons.locator("button");
    await expect(chevronBtns.first()).toBeVisible();
  });

  test("FAB button is visible", async ({ page }) => {
    const fab = page.locator('[data-layout="floating-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });
  });

  test("no overflow or horizontal scroll on mobile", async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // Allow a small tolerance (2px)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
