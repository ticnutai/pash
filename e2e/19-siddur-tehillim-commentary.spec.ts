import { expect, test } from "@playwright/test";

test("Tehillim commentary tab reuses the full luxury commentary experience", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => {
    pageErrors.push(error.message);
    console.log(`PAGE_ERROR: ${error.stack ?? error.message}`);
  });

  await page.goto("/siddur");
  await page.getByRole("button", { name: "תהילים", exact: true }).first().click();

  const tabs = page.locator('[data-layout="tehillim-content-tabs"]');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("button", { name: "תהילים", exact: true })).toHaveAttribute("aria-pressed", "true");
  await tabs.getByRole("button", { name: "פירושים", exact: true }).click();
  await expect(tabs.getByRole("button", { name: "פירושים", exact: true })).toHaveAttribute("aria-pressed", "true");

  const pane = page.locator('[data-layout="tehillim-commentary-pane"]');
  await expect(pane).toBeVisible();
  await expect(pane.getByRole("button", { name: "בחירת מפרשים" })).toBeVisible();
  await expect(pane.getByTitle("הגדרות תצוגת טקסט")).toBeVisible();
  await expect(pane.getByRole("button", { name: "פתח הגדרות תצוגה" })).toBeVisible();
  await expect(pane.getByRole("button", { name: "מזער את כל הפסוקים" })).toBeVisible();
  await expect(pane.locator('[data-luxury-template="classic"]')).toBeVisible();
  await expect(pane.locator("[data-luxury-pasuk-text]")).not.toHaveCount(0);
  const rashiCommentary = pane.locator("[data-luxury-commentary]").filter({ hasText: "רש״י" }).first();
  await expect(rashiCommentary).toBeVisible({ timeout: 20_000 });
  await expect(rashiCommentary).toContainText("אַשְׁרֵי");

  await pane.getByRole("button", { name: "בחירת מפרשים" }).click();
  const picker = page.getByRole("dialog", { name: "בחירת מפרשים" });
  for (const commentator of ["רש״י", "אבן עזרא", "רד״ק", "מצודת דוד", "מלבי״ם"]) {
    await expect(picker.getByRole("button", { name: commentator, exact: true })).toBeVisible();
  }
  await picker.getByRole("button", { name: "רד״ק", exact: true }).click();
  await picker.getByRole("button", { name: "שמור", exact: true }).click();
  await expect(pane.locator("[data-luxury-commentary]").filter({ hasText: "רד״ק" }).first()).toBeVisible({ timeout: 20_000 });

  await pane.getByRole("button", { name: "מזער את כל הפסוקים" }).click();
  await expect(pane.getByRole("button", { name: "הרחב את כל הפסוקים" })).toBeVisible();
  await expect(pane.locator("[data-luxury-pasuk-text]").first()).toBeVisible();
  await pane.getByRole("button", { name: "הרחב את כל הפסוקים" }).click();
  await expect(pane.getByRole("button", { name: "מזער את כל הפסוקים" })).toBeVisible();

  const commentaryControls = pane.locator('[data-layout="tehillim-commentary-controls"]');
  await expect(commentaryControls).toHaveCSS("display", "grid");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const minimizeStyle = await commentaryControls.getByRole("button", { name: "מזער את כל הפסוקים" }).evaluate(element => {
    const style = getComputedStyle(element);
    return { color: style.color, backgroundColor: style.backgroundColor, borderTopWidth: style.borderTopWidth };
  });
  expect(minimizeStyle.color).toBe("rgb(200, 160, 77)");
  expect(minimizeStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(minimizeStyle.borderTopWidth).toBe("0px");

  await pane.getByRole("button", { name: "פתח הגדרות תצוגה" }).click();
  await expect(page.getByRole("dialog", { name: "הגדרות תצוגת פירושי תהילים" })).toBeVisible();
  await page.getByRole("dialog", { name: "הגדרות תצוגת פירושי תהילים" }).getByRole("button", { name: "סגור הגדרות תצוגה" }).click();

  await pane.getByTitle("הגדרות תצוגת טקסט").click();
  await expect(page.locator('[data-layout="dialog-text-display"]')).toBeVisible();
  await page.locator('[data-layout="dialog-text-display"]').getByRole("button", { name: "ביטול" }).click();

  await pane.getByRole("button", { name: "פרק הבא" }).click();
  await expect(pane.locator('[data-layout="tehillim-commentary-navigation"]')).toContainText("פרק ב");
  expect(pageErrors).toEqual([]);
});
