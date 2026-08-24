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
  const divider = page.locator('[data-layout="luxury-top-divider"]');
  const navigationRow = page.locator('[data-layout="luxury-navigation-row"]');
  const navigation = page.locator('[data-layout="nav-buttons"]');
  await expect(divider).toBeVisible();
  await expect(toolbar).toBeVisible();
  const settingsButton = toolbar.getByRole("button", { name: "פתח הגדרות תצוגה" });
  const commentaryButton = toolbar.getByRole("button", { name: "בחירת מפרשים" });
  await expect(settingsButton).toBeVisible();
  await expect(commentaryButton).toBeVisible();
  const [toolbarBox, commentaryBox, settingsButtonBox] = await Promise.all([
    toolbar.boundingBox(),
    commentaryButton.boundingBox(),
    settingsButton.boundingBox(),
  ]);
  expect(toolbarBox).not.toBeNull();
  expect(commentaryBox).not.toBeNull();
  expect(settingsButtonBox).not.toBeNull();
  const toolbarCenter = toolbarBox!.x + toolbarBox!.width / 2;
  const commentaryCenter = commentaryBox!.x + commentaryBox!.width / 2;
  expect(Math.abs(toolbarCenter - commentaryCenter)).toBeLessThanOrEqual(1);
  expect(settingsButtonBox!.x).toBeGreaterThan(commentaryBox!.x + commentaryBox!.width);
  await expect(toolbar.getByRole("button", { name: "הגדרות", exact: true })).toHaveCount(0);
  await expect(settingsButton.locator("svg")).toHaveClass(/lucide-panels-top-left/);
  await expect(toolbar.locator("svg.lucide-eye")).toHaveCount(0);
  expect(await divider.evaluate(element => Number.parseFloat(getComputedStyle(element).marginBottom))).toBeGreaterThanOrEqual(16);
  await settingsButton.click();
  await expect(page.getByText('הגדרות תצוגת שמו"ת')).toBeVisible();
  await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
  const settingsSheet = page.getByTestId("luxury-display-settings-sheet");
  await expect.poll(async () => {
    const box = await settingsSheet.boundingBox();
    return box ? Math.round(box.y + box.height) : 0;
  }).toBe(915);
  const sheetBox = await settingsSheet.boundingBox();
  expect(sheetBox).not.toBeNull();
  expect(sheetBox!.height).toBeCloseTo(915 / 2, 0);
  expect(sheetBox!.y + sheetBox!.height).toBeCloseTo(915, 0);
  expect(sheetBox!.y).toBeGreaterThan(0);
  await settingsSheet.getByRole("button", { name: /נקי/ }).click();
  await expect(page.locator('[data-luxury-template="minimal"]')).toBeVisible();
  await expect(settingsSheet).toBeVisible();
  await expect(navigation).toBeVisible();
  const navigationBox = await navigation.boundingBox();
  const navigationRowBox = await navigationRow.boundingBox();
  expect(navigationBox).not.toBeNull();
  expect(navigationRowBox).not.toBeNull();
  expect(Math.abs((navigationBox!.x + navigationBox!.width / 2) - (navigationRowBox!.x + navigationRowBox!.width / 2))).toBeLessThanOrEqual(1);
  await expect(navigationRow).toHaveCSS("display", "grid");
  expect(settingsButtonBox!.width).toBeCloseTo(32, 0);
  expect(settingsButtonBox!.height).toBeCloseTo(32, 0);
  const navigationStyle = await navigation.evaluate(element => ({
    flexWrap: getComputedStyle(element).flexWrap,
    childCenters: Array.from(element.children).map(child => {
      const box = child.getBoundingClientRect();
      return box.top + box.height / 2;
    }),
  }));
  expect(navigationStyle.flexWrap).toBe("nowrap");
  expect(Math.max(...navigationStyle.childCenters) - Math.min(...navigationStyle.childCenters)).toBeLessThanOrEqual(1);
  expect(
    await divider.evaluate((element, tools) =>
      Boolean(element.compareDocumentPosition(tools as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await toolbar.elementHandle(),
    ),
  ).toBe(true);
  expect(
    await toolbar.evaluate((element, row) =>
      Boolean(element.compareDocumentPosition(row as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await navigationRow.elementHandle(),
    ),
  ).toBe(true);
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
  const textSettings = mobileControls.locator('[data-layout="luxury-text-settings"]').getByTitle("הגדרות תצוגת טקסט");
  await expect(mobileControls).toBeVisible();
  await expect(minimize).toBeVisible();
  await expect(textSettings).toBeVisible();
  await expect(navigationRow.getByTitle("הגדרות תצוגת טקסט")).toHaveCount(0);

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

  const firstPasuk = page.locator("[data-luxury-pasuk-text]").first();
  await expect(firstPasuk).toHaveCSS("position", "relative");
  const [markerBox, bodyBox, commentaryBodyBox] = await Promise.all([
    firstPasuk.locator("[data-luxury-pasuk-marker]").boundingBox(),
    firstPasuk.locator("[data-luxury-pasuk-body]").boundingBox(),
    page.locator("[data-luxury-commentary-body]").first().boundingBox(),
  ]);
  expect(markerBox).not.toBeNull();
  expect(bodyBox).not.toBeNull();
  expect(commentaryBodyBox).not.toBeNull();
  expect(markerBox!.x).toBeGreaterThan(bodyBox!.x + bodyBox!.width - 1);
  expect(Math.abs((bodyBox!.x + bodyBox!.width) - (commentaryBodyBox!.x + commentaryBodyBox!.width))).toBeLessThanOrEqual(1);

  await minimize.click();
  await expect(page.getByRole("button", { name: "הרחב את כל הפסוקים" })).toBeVisible();
  await page.getByRole("button", { name: "הרחב את כל הפסוקים" }).click();
  await expect(page.getByRole("button", { name: "מזער את כל הפסוקים" })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes("Failed to load resource"))).toEqual([]);
});

test("luxury navigation remains visible at tablet preview widths", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("torah-display-settings", JSON.stringify({
      version: 3,
      mode: "luxury",
      pasukCount: 10,
      loadMoreCount: 10,
      verseSideMargin: 0,
      headerLayout: "stacked",
      questionsExpanded: true,
      chumashExpanded: true,
    }));
  });
  await page.goto("/");

  const navigationRow = page.locator('[data-layout="luxury-navigation-row"]');
  await expect(navigationRow.locator('[data-layout="nav-buttons"]')).toBeVisible();
  await expect(page.locator('[data-layout="luxury-toolbar"]').getByRole("button", { name: "פתח הגדרות תצוגה" })).toBeVisible();

});

test("questions navigation remains visible at tablet preview widths", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("torah-display-settings", JSON.stringify({
      version: 3,
      mode: "compact",
      pasukCount: 10,
      loadMoreCount: 10,
      verseSideMargin: 0,
      headerLayout: "stacked",
      questionsExpanded: true,
      chumashExpanded: true,
    }));
  });
  await page.goto("/");

  await expect(page.locator('[data-layout="nav-buttons"]')).toBeVisible();
});

test("right swipe anywhere in Chumash and commentaries opens the commentator picker", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "חומש ומפרשים" }).click();

  const surface = page.locator('[data-commentary-swipe-surface]');
  await expect(surface).toBeVisible();
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  await surface.evaluate((element, point) => {
    const touch = (x: number, y: number) => new Touch({
      identifier: 1,
      target: element,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
    });
    const start = touch(point.x + 30, point.y + 220);
    element.dispatchEvent(new TouchEvent("touchstart", {
      bubbles: true,
      cancelable: true,
      touches: [start],
      targetTouches: [start],
      changedTouches: [start],
    }));
    const end = touch(point.x + Math.min(point.width - 20, 180), point.y + 225);
    element.dispatchEvent(new TouchEvent("touchend", {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [end],
    }));
  }, box!);

  const picker = page.getByRole("dialog", { name: "בחירת מפרשים" });
  await expect(picker).toBeVisible();
  const pickerPanel = page.getByTestId("commentary-picker-dialog");
  await expect(pickerPanel).toHaveCSS("border-radius", "28px");
  await expect(pickerPanel).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.getByTestId("commentary-picker-header")).toHaveCSS("background-color", "rgb(11, 35, 75)");
  await expect(page.locator("[data-dialog-overlay]")).toHaveCount(0);
  await expect(picker.locator("[data-commentary-option]").first()).toHaveCSS("border-radius", "16px");
  await expect(page).toHaveURL(/\/$/);
});

test("floating search button uses the smaller mobile size", async ({ page }) => {
  await page.goto("/");
  const fab = page.locator('[data-layout="fab-toggle"]');
  await expect(fab).toBeVisible();
  const box = await fab.boundingBox();
  expect(box?.width).toBeCloseTo(40, 0);
  expect(box?.height).toBeCloseTo(40, 0);
});

test("Galaxy S25 narrow layout keeps T and display controls in their requested rows", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await page.getByRole("button", { name: "חומש ומפרשים" }).click();

  const mobileControls = page.locator('[data-layout="mobile-controls"]');
  const textSettings = mobileControls.locator('[data-layout="luxury-text-settings"]');
  const toolbar = page.locator('[data-layout="luxury-toolbar"]');
  const displaySettings = toolbar.getByRole("button", { name: "פתח הגדרות תצוגה" });
  const commentaryPicker = toolbar.getByRole("button", { name: "בחירת מפרשים" });
  await expect(textSettings).toBeVisible();
  await expect(displaySettings).toBeVisible();

  const [controlsBox, textBox, toolbarBox, displayBox, pickerBox] = await Promise.all([
    mobileControls.boundingBox(), textSettings.boundingBox(), toolbar.boundingBox(),
    displaySettings.boundingBox(), commentaryPicker.boundingBox(),
  ]);
  for (const box of [controlsBox, textBox, toolbarBox, displayBox, pickerBox]) expect(box).not.toBeNull();
  expect(textBox!.x + textBox!.width / 2).toBeGreaterThan(controlsBox!.x + controlsBox!.width * 0.75);
  expect(displayBox!.x + displayBox!.width / 2).toBeGreaterThan(toolbarBox!.x + toolbarBox!.width * 0.75);
  expect(Math.abs((pickerBox!.x + pickerBox!.width / 2) - (toolbarBox!.x + toolbarBox!.width / 2))).toBeLessThanOrEqual(1);

  const pasuk = page.locator("[data-luxury-pasuk-text]").first();
  const [markerBox, bodyBox, commentaryBodyBox] = await Promise.all([
    pasuk.locator("[data-luxury-pasuk-marker]").boundingBox(),
    pasuk.locator("[data-luxury-pasuk-body]").boundingBox(),
    page.locator("[data-luxury-commentary-body]").first().boundingBox(),
  ]);
  expect(markerBox).not.toBeNull();
  expect(bodyBox).not.toBeNull();
  expect(commentaryBodyBox).not.toBeNull();
  expect(markerBox!.x).toBeGreaterThan(bodyBox!.x + bodyBox!.width - 1);
  expect(Math.abs((bodyBox!.x + bodyBox!.width) - (commentaryBodyBox!.x + commentaryBodyBox!.width))).toBeLessThanOrEqual(1);
});
