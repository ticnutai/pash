import { expect, test } from "@playwright/test";

test("luxury text settings are scoped and survive expanded, minimized and every template", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "חומש ומפרשים" }).click();

  const mobileControls = page.locator('[data-layout="mobile-controls"]');
  const localTextTrigger = mobileControls.locator('[data-layout="luxury-text-settings"]').getByTitle("הגדרות תצוגת טקסט");
  await expect(localTextTrigger).toBeVisible();
  await expect(page.locator('[data-layout="luxury-navigation-row"]').getByTitle("הגדרות תצוגת טקסט")).toHaveCount(0);

  await localTextTrigger.click();
  const dialog = page.locator('[data-layout="dialog-text-display"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("מספר פסוקים בכל טעינה")).toHaveCount(0);

  for (const label of [
    "גודל פסוקים",
    "גופן פסוקים",
    "טקסט מודגש",
    "יישור טקסט",
    "גובה שורה",
    "מרווח תוכן",
    "רוחב תוכן",
    "מרווח בין אותיות",
    "מרווח בין מילים",
  ]) {
    await expect(dialog.getByText(label, { exact: true })).toBeAttached();
  }

  await dialog.locator('[role="slider"]').first().press("End");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /אריאל/ }).click();
  const boldSwitch = dialog.getByRole("switch").first();
  if ((await boldSwitch.getAttribute("data-state")) !== "checked") await boldSwitch.click();
  await dialog.getByTitle("מרכז").click();
  await dialog.getByRole("button", { name: "שמור", exact: true }).click();
  await expect(dialog).toBeHidden();

  const verse = page.locator("[data-luxury-pasuk-text]").first();
  await expect(verse).toBeVisible();
  const assertScopedVerseStyle = async () => {
    const style = await verse.evaluate(element => {
      const computed = getComputedStyle(element);
      return {
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        textAlign: computed.textAlign,
      };
    });
    expect(style.fontFamily).toContain("Arial");
    expect(style.fontSize).toBe("28px");
    expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(700);
    expect(style.textAlign).toBe("center");
  };
  await assertScopedVerseStyle();

  const displaySettingsTrigger = page.locator('[data-layout="luxury-toolbar"]').getByRole("button", { name: "פתח הגדרות תצוגה" });
  await displaySettingsTrigger.click();
  const templateSheet = page.getByTestId("luxury-display-settings-sheet");
  const templates = [
    ["קלאסי", "classic"],
    ["נקי", "minimal"],
    ["גלילה", "scroll"],
    ["כרטיסיות", "fragment"],
  ] as const;
  for (const [name, id] of templates) {
    await templateSheet.getByRole("button", { name: new RegExp(name) }).click();
    await expect(page.locator(`[data-luxury-template="${id}"]`)).toBeVisible();
    await assertScopedVerseStyle();
  }
  await templateSheet.getByRole("button", { name: "סגור הגדרות תצוגה" }).click();

  await page.getByRole("button", { name: "מזער את כל הפסוקים" }).click();
  await expect(page.getByRole("button", { name: "הרחב את כל הפסוקים" })).toBeVisible();
  await assertScopedVerseStyle();

  const storage = await page.evaluate(() => ({
    scoped: localStorage.getItem("torah-font-color-settings-mobile-luxury"),
    global: localStorage.getItem("torah-font-color-settings-mobile"),
  }));
  expect(storage.scoped).toContain('"pasukFont":"Arial"');
  expect(storage.scoped).toContain('"pasukBold":true');
  expect(storage.global ?? "").not.toContain('"pasukFont":"Arial"');
  expect(pageErrors).toEqual([]);
});
