import { expect, test } from "@playwright/test";

test("smart Siddur emphasis is optional, previews immediately, and persists", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/siddur");
  await page.getByTitle("הגדרות תצוגת טקסט").click();

  const dialog = page.locator('[data-layout="dialog-text-display"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("siddur-semantic-emphasis-settings")).toBeVisible();

  const headingSwitch = dialog.getByRole("switch", { name: "כותרות מודגשות" });
  const openingSwitch = dialog.getByRole("switch", { name: "פתיחת פסקה מודגשת" });
  await expect(headingSwitch).not.toBeChecked();
  await expect(openingSwitch).not.toBeChecked();

  await headingSwitch.click();
  await openingSwitch.click();
  await dialog.getByRole("button", { name: "2 מילים" }).click();
  await dialog.getByRole("button", { name: "שמור" }).click();

  const firstSection = page.locator("[data-siddur-card]").first();
  await expect(firstSection).toBeVisible();
  const toggle = firstSection.getByRole("button").first();
  if ((await firstSection.locator("p").count()) === 0) await toggle.click();
  await expect(firstSection.locator("p strong").first()).toBeVisible();

  await page.reload();
  await page.getByTitle("הגדרות תצוגת טקסט").click();
  const reopened = page.locator('[data-layout="dialog-text-display"]');
  await expect(reopened.getByRole("switch", { name: "כותרות מודגשות" })).toBeChecked();
  await expect(reopened.getByRole("switch", { name: "פתיחת פסקה מודגשת" })).toBeChecked();
  await expect(reopened.getByRole("button", { name: "2 מילים" })).toHaveAttribute("aria-pressed", "true");
  expect(pageErrors).toEqual([]);
});
