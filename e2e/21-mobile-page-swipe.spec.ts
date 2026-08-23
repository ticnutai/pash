import { expect, test, type Page } from "@playwright/test";

async function swipe(page: Page, fromX: number, toX: number, fromY = 500, toY = 505) {
  await page.evaluate(({ fromX, toX, fromY, toY }) => {
    const target = document.elementFromPoint(fromX, fromY) ?? document.body;
    const touch = (x: number, y: number) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(fromX, fromY)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(toX, toY)] }));
  }, { fromX, toX, fromY, toY });
}

test("horizontal gestures navigate between the main mobile pages without hijacking vertical gestures", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-mobile-page-swipe", "enabled");

  await swipe(page, 320, 80);
  await expect(page).toHaveURL(/\/siddur$/);

  // A mostly vertical movement must not navigate.
  await swipe(page, 250, 210, 250, 500);
  await expect(page).toHaveURL(/\/siddur$/);

  await swipe(page, 320, 80);
  await expect(page).toHaveURL(/\/omer$/);

  await swipe(page, 80, 320);
  await expect(page).toHaveURL(/\/siddur$/);
  await swipe(page, 80, 320);
  await expect(page).toHaveURL(/\/$/);

  expect(pageErrors).toEqual([]);
});

test("swipes starting on controls are ignored", async ({ page }) => {
  await page.goto("/siddur");
  await expect(page.locator("button").first()).toBeVisible();
  await page.evaluate(() => {
    const button = document.querySelector("button");
    if (!button) throw new Error("No button found");
    const touch = (x: number) => new Touch({ identifier: 2, target: button, clientX: x, clientY: 120 });
    button.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(320)] }));
    button.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(80)] }));
  });
  await expect(page).toHaveURL(/\/siddur$/);
});
