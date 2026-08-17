import { expect, test } from "@playwright/test";

test("Chumash theme editor uses the Siddur half-screen panel on mobile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "פתח ערכות נושא" }).click();

  const panel = page.locator('[data-theme-panel="chumash"]');
  const preview = page.getByTestId("chumash-theme-preview");
  await expect(page.locator("[data-dialog-overlay]" )).toHaveCount(0);
  await expect(panel.getByText(/ערכת נושא/).first()).toBeVisible();
  await expect(panel.getByRole("button", { name: "בחירת ערכה" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "עריכה מותאמת" })).toBeVisible();
  await expect(preview).toBeHidden();

  const swatchColors = await panel.locator("[data-theme-swatch]").evaluateAll(swatches =>
    swatches.map(swatch => {
      const parts = Array.from(swatch.children).map(child => getComputedStyle(child).backgroundColor);
      return [getComputedStyle(swatch).backgroundColor, ...parts].join("|");
    }),
  );
  expect(new Set(swatchColors).size).toBeGreaterThan(3);

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(412, 0);
  expect(box!.height).toBeCloseTo(915 / 2, 0);
  expect(box!.y + box!.height).toBeCloseTo(915, 0);

  await panel.getByRole("button", { name: "עריכה מותאמת" }).click();
  await expect(panel.getByRole("button", { name: "בחירת הדגשה" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "ביטול" })).toBeVisible();

  const scrollArea = panel.locator('[role="tabpanel"][data-state="active"]');
  const mobileScroll = await scrollArea.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(mobileScroll.scrollHeight).toBeGreaterThan(mobileScroll.clientHeight);
  await scrollArea.evaluate(element => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => scrollArea.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(panel.getByTitle("סגור")).toBeVisible();
  await panel.getByTitle("סגור").click();
  await expect(panel).toBeHidden();

  await page.getByRole("button", { name: "פתח ערכות נושא" }).click();
  await expect(panel).toBeVisible();
  const fullMode = page.getByRole("button", { name: "חומש ומפרשים" });
  await fullMode.click();
  await expect(fullMode).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toBeHidden();

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

  const desktopScrollArea = panel.locator('[role="tabpanel"][data-state="active"]');
  const desktopBox = await panel.boundingBox();
  expect(desktopBox).not.toBeNull();
  expect(desktopBox!.y).toBeGreaterThanOrEqual(0);
  expect(desktopBox!.y + desktopBox!.height).toBeLessThanOrEqual(900);
  await expect(desktopScrollArea).toHaveCSS("overflow-y", "auto");

  const beforeBorder = await preview.evaluate(element => getComputedStyle(element).borderColor);
  await panel.getByRole("button", { name: "בחירת הדגשה" }).click();
  const hex = page.getByRole("textbox", { name: "ערך צבע HEX" });
  await hex.fill("ff3355");

  await expect.poll(() => preview.evaluate(element => getComputedStyle(element).borderColor))
    .not.toBe(beforeBorder);

});
