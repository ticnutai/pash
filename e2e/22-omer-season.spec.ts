import { expect, test, type Page } from "@playwright/test";

async function swipeLeft(page: Page) {
  await page.evaluate(() => {
    const target = document.elementFromPoint(300, 500) ?? document.body;
    const touch = (x: number) => new Touch({ identifier: 8, target, clientX: x, clientY: 500 });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(300)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(80)] }));
  });
}

test("Omer entry points are hidden and the route is blocked outside the Hebrew counting season", async ({ page }) => {
  await page.addInitScript(() => { window.__OMER_TEST_NOW__ = "2026-08-23T12:00:00+03:00"; });
  await page.goto("/");

  await expect(page.getByTitle("ספירת העומר")).toHaveCount(0);
  await page.goto("/omer");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/siddur");
  await swipeLeft(page);
  await expect(page).toHaveURL(/\/siddur$/);
});

test("Omer entry points and page are available during the Hebrew counting season", async ({ page }) => {
  await page.addInitScript(() => { window.__OMER_TEST_NOW__ = "2026-04-10T12:00:00+03:00"; });
  await page.goto("/");

  await expect(page.getByTitle("ספירת העומר").first()).toBeAttached();
  await page.goto("/omer");
  await expect(page).toHaveURL(/\/omer$/);
  await expect(page.getByText(/ספירת העומר/).first()).toBeVisible();
});

test("the season starts on the first Omer evening and closes after day 49", async ({ page }) => {
  await page.addInitScript(() => { window.__OMER_TEST_NOW__ = "2026-04-02T20:00:00+03:00"; });
  await page.goto("/omer");
  await expect(page).toHaveURL(/\/omer$/);

  await page.evaluate(() => {
    window.__OMER_TEST_NOW__ = "2026-05-21T20:00:00+03:00";
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page).toHaveURL(/\/$/);
});
