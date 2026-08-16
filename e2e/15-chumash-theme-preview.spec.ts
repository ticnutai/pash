import { expect, test } from "@playwright/test";

test("Chumash theme editor uses the Siddur half-screen panel on mobile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "פתח ערכות נושא" }).click();

  const panel = page.locator('[data-theme-panel="chumash"]');
  const preview = page.getByTestId("chumash-theme-preview");
  await expect(panel.getByText(/ערכת נושא/).first()).toBeVisible();
  await expect(panel.getByRole("button", { name: "בחירת ערכה" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "עריכה מותאמת" })).toBeVisible();
  await expect(preview).toBeHidden();

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(412, 0);
  expect(box!.height).toBeCloseTo(915 / 2, 0);
  expect(box!.y + box!.height).toBeCloseTo(915, 0);

  await panel.getByRole("button", { name: "עריכה מותאמת" }).click();
  await expect(panel.getByRole("button", { name: "בחירת הדגשה" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "ביטול" })).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test("Chumash theme editor uses the Siddur preview column on wider screens", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "פתח ערכות נושא" }).click();

  const panel = page.locator('[data-theme-panel="chumash"]');
  const preview = page.getByTestId("chumash-theme-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("בְּרֵאשִׁית בָּרָא אֱלֹהִים");

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(628, 0);
  expect(box!.y).toBeCloseTo(64, 0);

  await panel.getByRole("button", { name: "עריכה מותאמת" }).click();

  const beforeBorder = await preview.evaluate(element => getComputedStyle(element).borderColor);
  await panel.getByRole("button", { name: "בחירת הדגשה" }).click();
  const hex = page.getByRole("textbox", { name: "ערך צבע HEX" });
  await hex.fill("ff3355");

  await expect.poll(() => preview.evaluate(element => getComputedStyle(element).borderColor))
    .not.toBe(beforeBorder);

});
