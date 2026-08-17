import { expect, test } from "@playwright/test";

test("Siddur includes the full editable Chumash Gold theme", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/siddur");
  await page.getByTitle("ערכת נושא").click();

  const panel = page.locator("[data-siddur-theme-panel]");
  const option = panel.locator('[data-siddur-theme-option="chumash_gold"]');
  await expect(option).toContainText("חומש זהב");

  await option.getByRole("button", { name: "ערוך" }).click();
  for (const label of [
    "רקע כותרת/טאבים",
    "טקסט כותרת",
    "הדגשה בכותרת",
    "רקע דף",
    "רקע כרטיס",
    "מסגרת כרטיס",
    "טקסט תפילה",
    "כותרת מקטע",
    "הוראות / רוביקה",
    "צבע הדגשה (זהב)",
    "עיגול כרטיסים",
    "עיגול כפתורים",
    "עובי מסגרת",
    "עוצמת צל",
  ]) {
    await expect(panel.getByText(label, { exact: true }).first()).toBeVisible();
  }

  await panel.getByRole("button", { name: "בחירת ערכה" }).click();
  await option.getByRole("button", { name: "בחר חומש זהב" }).click();
  await expect(page.locator('[data-siddur-theme="chumash_gold"]')).toBeVisible();
  await expect(page.locator(".siddur-themed-root header").first()).toHaveCSS("background-color", "rgb(20, 43, 87)");
  expect(pageErrors).toEqual([]);
});

test("Chumash Gold theme is available in the desktop Siddur theme panel", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/siddur");
  await page.getByTitle("ערכת נושא").click();

  const panel = page.locator("[data-siddur-theme-panel]");
  await expect(panel.locator('[data-siddur-theme-option="chumash_gold"]')).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(628, 0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);
});
