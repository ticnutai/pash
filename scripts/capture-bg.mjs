/**
 * Captures the real Index page at a fixed viewport and saves it to
 * public/layout-bg.png  (served by Vite at /layout-bg.png)
 *
 * Usage:  node scripts/capture-bg.mjs
 * Then:  visit http://localhost:5001/layout-editor
 */

import { chromium } from "playwright";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const OUT    = join(PUBLIC, "layout-bg.png");

if (!existsSync(PUBLIC)) mkdirSync(PUBLIC, { recursive: true });

// ── Same fixed size the LayoutEditor canvas will use ──────────────────────
const W = 1400;
const H = 900;

const BASE = "http://localhost:5001";

(async () => {
  console.log(`📸  Capturing real Index page at ${W}×${H}…`);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  await page.setViewportSize({ width: W, height: H });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // Wait for the sefer selector to render
  await page.waitForSelector(".bg-card", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000); // fonts + animations

  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();

  console.log(`✅  Saved  public/layout-bg.png  (${W}×${H})`);
  console.log("    Now open:  http://localhost:5001/layout-editor");
})();
