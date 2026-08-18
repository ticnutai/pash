import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PLAY_STORE_BASE_URL || "http://localhost:4300";
const outputDir = path.resolve("google-play-upload/screenshots");
await fs.mkdir(outputDir, { recursive: true });

for (const name of await fs.readdir(outputDir)) {
  if (/^0\d_.*\.png$/i.test(name)) await fs.rm(path.join(outputDir, name));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "he-IL",
  timezoneId: "Asia/Jerusalem",
  colorScheme: "light",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

async function shot(name) {
  await page.waitForTimeout(350);
  await page.locator('[data-sonner-toast], [data-dev-mobile-preview]').evaluateAll(elements => elements.forEach(element => element.remove()));
  await page.screenshot({ path: path.join(outputDir, name), fullPage: false, animations: "disabled" });
  console.log(`Captured ${name} (1080x1920)`);
}

await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
await shot("01_home_current.png");

const luxuryMode = page.getByRole("button", { name: "חומש ומפרשים" });
if (await luxuryMode.isVisible()) {
  await luxuryMode.click();
  await page.locator('[data-luxury-template]').first().waitFor({ state: "visible" });
}
await shot("02_chumash_commentaries.png");

await page.goto(`${baseURL}/siddur`, { waitUntil: "networkidle" });
await shot("03_siddur_home.png");

const firstCard = page.locator("[data-siddur-card]").first();
if (await firstCard.isVisible()) {
  const firstToggle = firstCard.getByRole("button").first();
  if ((await firstCard.locator("p").count()) === 0 && await firstToggle.isVisible()) await firstToggle.click();
  await firstCard.scrollIntoViewIfNeeded();
}
await shot("04_siddur_prayer.png");

await page.getByTitle("הגדרות תצוגת טקסט").click();
const settings = page.locator('[data-layout="dialog-text-display"]');
await settings.getByRole("switch", { name: "כותרות מודגשות" }).click();
await settings.getByRole("switch", { name: "פתיחת פסקה מודגשת" }).click();
await settings.getByRole("button", { name: "2 מילים" }).click();
await shot("05_siddur_smart_design.png");
await settings.getByRole("button", { name: "שמור" }).click();

await page.getByRole("button", { name: "תהילים", exact: true }).first().click();
await page.getByText("פרק א׳", { exact: false }).first().waitFor({ state: "visible" }).catch(() => {});
await shot("06_tehillim.png");

const contentTabs = page.locator('[data-layout="tehillim-content-tabs"]');
if (await contentTabs.isVisible()) {
  await contentTabs.getByRole("button", { name: "פירושים", exact: true }).click();
  await page.locator('[data-layout="tehillim-commentary-pane"]').waitFor({ state: "visible" });
}
await shot("07_tehillim_commentaries.png");

await browser.close();
if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
