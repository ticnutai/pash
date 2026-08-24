import { expect, test } from "@playwright/test";

async function pressAndroidBack(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    if (!window.__PASH_TEST_ANDROID_BACK__) throw new Error("Android back test bridge is unavailable");
    return window.__PASH_TEST_ANDROID_BACK__();
  });
}

test("Android back closes commentary picker and other widgets before navigating", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "חומש ומפרשים" }).click();

  const pickerButton = page.getByRole("button", { name: "בחירת מפרשים" });
  await pickerButton.click();
  const picker = page.getByTestId("commentary-picker-dialog");
  await expect(picker).toBeVisible();

  expect(await pressAndroidBack(page)).toBe("dismissed");
  await expect(picker).toBeHidden();
  await expect(page).toHaveURL(/\/$/);

  const displaySettingsButton = page.getByRole("button", { name: "פתח הגדרות תצוגה" });
  await displaySettingsButton.click();
  const settingsSheet = page.getByTestId("luxury-display-settings-sheet");
  await expect(settingsSheet).toBeVisible();
  expect(await pressAndroidBack(page)).toBe("dismissed");
  await expect(settingsSheet).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});

test("commentary picker keeps its design but the clear outside area dismisses it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "חומש ומפרשים" }).click();
  await page.getByRole("button", { name: "בחירת מפרשים" }).click();

  const picker = page.getByTestId("commentary-picker-dialog");
  await expect(picker).toBeVisible();
  await expect(page.getByTestId("commentary-picker-header")).toHaveCSS("background-color", "rgb(11, 35, 75)");
  await expect(page.locator("[data-dialog-overlay]")).toHaveCount(0);

  // The top app bar remains visible and interactive as a click-away area.
  await page.mouse.click(10, 10);
  await expect(picker).toBeHidden();
});

test("Android back returns from an inner screen and exits only on a clean home", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => history.pushState({}, "", "/siddur"));
  await page.reload();
  await expect(page).toHaveURL(/\/siddur$/);

  expect(await pressAndroidBack(page)).toBe("navigated");
  await expect(page).toHaveURL(/\/$/);

  expect(await pressAndroidBack(page)).toBe("exit");
  await expect(page).toHaveURL(/\/$/);
});
