import { expect, test } from "@playwright/test";

test("development-only Galaxy S25 preview opens at the target viewport without recursion", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto("/");

  const trigger = page.getByTestId("dev-galaxy-preview-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();

  const preview = page.getByTestId("dev-galaxy-preview");
  const iframe = preview.locator("iframe");
  await expect(preview).toBeVisible();
  await expect(iframe).toBeVisible();

  const frameBox = await iframe.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(frameBox!.width).toBeCloseTo(360, 0);
  expect(frameBox!.height).toBeCloseTo(780, 0);

  const frame = page.frameLocator('iframe[title="Galaxy S25 mobile preview"]');
  await expect(frame.locator("body")).toBeVisible();
  await expect(frame.getByTestId("dev-galaxy-preview-trigger")).toHaveCount(0);

  await page.getByRole("button", { name: "סגור תצוגת מובייל" }).click();
  await expect(preview).toBeHidden();
});

test("Galaxy S25 preview scales into a narrow in-app browser pane without changing its logical viewport", async ({ page }) => {
  await page.setViewportSize({ width: 180, height: 780 });
  await page.goto("/");
  await page.getByTestId("dev-galaxy-preview-trigger").click();

  const preview = page.getByTestId("dev-galaxy-preview");
  const device = page.getByTestId("dev-galaxy-preview-device");
  await expect(preview).toBeVisible();
  await expect(device).toBeVisible();

  const deviceBox = await device.boundingBox();
  expect(deviceBox).not.toBeNull();
  expect(deviceBox!.x).toBeGreaterThanOrEqual(0);
  expect(deviceBox!.x + deviceBox!.width).toBeLessThanOrEqual(180);
  expect(deviceBox!.height).toBeLessThan(662);

  const frame = page.frameLocator('iframe[title="Galaxy S25 mobile preview"]');
  await expect(frame.locator("body")).toBeVisible();
  expect(await frame.locator("body").evaluate(() => window.innerWidth)).toBe(360);
  expect(await frame.locator("body").evaluate(() => window.innerHeight)).toBe(780);
});
