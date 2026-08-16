import { expect, test } from "@playwright/test";

test("mobile luxury controls keep navigation below the toolbar and use subtle gold styling", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  const luxuryMode = page.getByRole("button", { name: "חומש ומפרשים" });
  await luxuryMode.click();
  await expect(luxuryMode).toHaveAttribute("aria-pressed", "true");

  const toolbar = page.locator('[data-layout="luxury-toolbar"]');
  const navigation = page.locator('[data-layout="nav-buttons"]');
  await expect(toolbar).toBeVisible();
  await expect(navigation).toBeVisible();
  expect(
    await toolbar.evaluate((element, nav) =>
      Boolean(element.compareDocumentPosition(nav as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await navigation.elementHandle(),
    ),
  ).toBe(true);

  const modeStyle = await luxuryMode.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderColor: style.borderColor };
  });
  expect(modeStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(modeStyle.borderColor).not.toBe("rgba(0, 0, 0, 0)");

  const minimize = page.getByRole("button", { name: "מזער את כל הפסוקים" });
  const mobileControls = page.locator('[data-layout="mobile-controls"]');
  const textSettings = mobileControls.getByTitle("הגדרות תצוגת טקסט");
  await expect(mobileControls).toBeVisible();
  await expect(minimize).toBeVisible();
  await expect(textSettings).toBeVisible();

  const controlsLayout = await mobileControls.evaluate((element) => {
    const style = getComputedStyle(element);
    const children = Array.from(element.children).map((child) => child.getBoundingClientRect());
    return {
      display: style.display,
      columnGap: Number.parseFloat(style.columnGap),
      paddingTop: Number.parseFloat(style.paddingTop),
      centers: children.map((rect) => rect.left + rect.width / 2),
    };
  });
  expect(controlsLayout.display).toBe("grid");
  expect(controlsLayout.columnGap).toBeGreaterThanOrEqual(12);
  expect(controlsLayout.paddingTop).toBeGreaterThanOrEqual(12);
  expect(controlsLayout.centers[0]).toBeLessThan(controlsLayout.centers[1]);
  expect(controlsLayout.centers[1]).toBeLessThan(controlsLayout.centers[2]);

  const [minimizeColor, textSettingsColor] = await Promise.all([
    minimize.evaluate((element) => getComputedStyle(element).color),
    textSettings.evaluate((element) => getComputedStyle(element).color),
  ]);
  expect(minimizeColor).toBe("rgb(200, 160, 77)");
  expect(minimizeColor).toBe(textSettingsColor);
  const minimizeStyle = await minimize.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      color: style.color,
    };
  });
  expect(minimizeStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(minimizeStyle.borderTopWidth).toBe("0px");

  await minimize.click();
  await expect(page.getByRole("button", { name: "הרחב את כל הפסוקים" })).toBeVisible();
  await page.getByRole("button", { name: "הרחב את כל הפסוקים" }).click();
  await expect(page.getByRole("button", { name: "מזער את כל הפסוקים" })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes("Failed to load resource"))).toEqual([]);
});
