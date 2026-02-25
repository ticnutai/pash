/**
 * Playwright screenshot comparison:
 *  1. Screenshots the real Index page  → screenshots/real-index.png
 *  2. Screenshots the layout editor   → screenshots/layout-editor.png
 *  3. Generates a side-by-side HTML diff → screenshots/compare.html
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "screenshots");
if (!existsSync(OUT)) mkdirSync(OUT);

const BASE = "http://localhost:5001";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });

  // ── 1. Real Index page ──────────────────────────────────────────────────
  console.log("📸  Capturing real Index page…");
  const pageReal = await ctx.newPage();
  await pageReal.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // Wait for sefer selector to appear
  await pageReal.waitForSelector("[data-quick-selector], .bg-sidebar", { timeout: 8000 }).catch(() => {});
  await pageReal.waitForTimeout(800); // let fonts/animations settle
  await pageReal.screenshot({ path: join(OUT, "real-index.png"), fullPage: false });
  console.log("✅  Saved  screenshots/real-index.png");

  // ── 2. Layout editor ────────────────────────────────────────────────────
  console.log("📸  Capturing layout editor…");
  const pageEditor = await ctx.newPage();
  await pageEditor.goto(`${BASE}/layout-editor`, { waitUntil: "networkidle" });
  await pageEditor.waitForTimeout(800);
  await pageEditor.screenshot({ path: join(OUT, "layout-editor.png"), fullPage: false });
  console.log("✅  Saved  screenshots/layout-editor.png");

  await browser.close();

  // ── 3. Generate side-by-side HTML ──────────────────────────────────────
  const html = /* html */`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>השוואת פריסה — אחד לאחד</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
    header { padding: 14px 20px; background: #1e293b; border-bottom: 1px solid #334155;
      display: flex; align-items: center; justify-content: space-between; }
    header h1 { font-size: 16px; font-weight: 700; }
    header span { font-size: 12px; color: #64748b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 100%; }
    .pane { position: relative; }
    .pane label {
      position: absolute; top: 10px; right: 10px; z-index: 10;
      background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 4px; pointer-events: none;
    }
    .pane img { width: 100%; display: block; }

    /* overlay diff toggle */
    .diff-wrap { position: relative; overflow: hidden; cursor: crosshair; }
    .diff-wrap img.overlay {
      position: absolute; top: 0; left: 0; width: 100%; opacity: 0.5;
      mix-blend-mode: difference; pointer-events: none;
    }

    .controls { padding: 12px 20px; display: flex; gap: 12px; align-items: center;
      background: #1e293b; border-bottom: 1px solid #334155; flex-wrap: wrap; }
    .controls label { font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .controls input[type=range] { width: 140px; }
    a { color: #60a5fa; text-decoration: none; font-size: 12px; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <h1>🔍 השוואת פריסה — עמוד אמיתי מול Layout Editor</h1>
    <span>צולם ב-${new Date().toLocaleString("he-IL")}</span>
  </header>

  <div class="controls">
    <label>
      <input type="checkbox" id="toggleOverlay" onchange="toggleOv(this)">
      הצג שכבת-על (blend-difference)
    </label>
    <label>
      שקיפות שכבה: <input type="range" min="0" max="100" value="50" id="opRange"
        oninput="document.querySelector('.overlay').style.opacity = this.value/100">
    </label>
    <a href="real-index.png" target="_blank">פתח צילום אמיתי ↗</a>
    <a href="layout-editor.png" target="_blank">פתח צילום editor ↗</a>
  </div>

  <div class="grid">
    <div class="pane diff-wrap" id="realPane">
      <label>עמוד הבית (אמיתי)</label>
      <img src="real-index.png" alt="real" />
      <img class="overlay" src="layout-editor.png" alt="overlay" style="display:none;opacity:0.5" />
    </div>
    <div class="pane">
      <label>Layout Editor</label>
      <img src="layout-editor.png" alt="editor" />
    </div>
  </div>

  <script>
    function toggleOv(cb) {
      document.querySelector('.overlay').style.display = cb.checked ? 'block' : 'none';
    }
  </script>
</body>
</html>`;

  writeFileSync(join(OUT, "compare.html"), html, "utf8");
  console.log("\n✅  Done!  Open:  screenshots/compare.html");
  console.log("────────────────────────────────────────────────────");
  console.log("   Real page  →  screenshots/real-index.png");
  console.log("   Editor     →  screenshots/layout-editor.png");
  console.log("   Diff HTML  →  screenshots/compare.html");
})();
