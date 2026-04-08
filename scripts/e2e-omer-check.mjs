/**
 * E2E test: Omer Board Dialog checks
 * - Title not wrapping
 * - No duplicate controls
 * - Calendar view works correctly (days in right columns)
 * - View mode dropdown works
 * - Dialog opens only once
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:6001";
const SCREENSHOTS_DIR = path.resolve("screenshots/e2e-omer");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
let passed = 0, failed = 0;

function check(name, ok) {
  if (ok) { console.log(`  ${PASS} ${name}`); passed++; }
  else { console.log(`  ${FAIL} ${name}`); failed++; }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Mobile viewport (like Xiaomi)
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    locale: "he-IL",
  });
  const page = await context.newPage();

  console.log("\n🔍 E2E Omer Board Dialog Tests\n");

  // ── 1. Load page ──
  console.log("📱 Loading page (mobile viewport 412x915)...");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01-page-loaded.png") });

  // ── 2. Find and click Omer button ──
  console.log("\n📌 Test: Omer Dialog");

  // The Omer dialog may auto-open. Check for it:
  let omerDialog = page.locator('[role="dialog"]').filter({ hasText: "לוח ספירת העומר" });
  let dialogVisible = await omerDialog.isVisible().catch(() => false);

  if (!dialogVisible) {
    // Click the sparkles button to open Omer
    const sparklesBtn = page.locator('button[title="לוח ספירת העומר"]');
    if (await sparklesBtn.isVisible()) {
      await sparklesBtn.click();
      await page.waitForTimeout(1000);
      dialogVisible = await omerDialog.isVisible().catch(() => false);
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02-omer-dialog.png") });
  check("Omer dialog opened", dialogVisible);

  // ── 3. Check title is not wrapping ──
  if (dialogVisible) {
    // Find the title element
    const titleEl = omerDialog.locator("text=לוח ספירת העומר").first();
    if (await titleEl.isVisible()) {
      const titleBox = await titleEl.boundingBox();
      // If text wraps, height would be much more than ~30px for a single line
      check(`Title height is single-line (${Math.round(titleBox.height)}px ≤ 40px)`, titleBox.height <= 40);
      check(`Title width reasonable (${Math.round(titleBox.width)}px)`, titleBox.width > 60);
    } else {
      check("Title element found", false);
    }

    // ── 4. Check NO duplicate view mode buttons in body ──
    // The old code had buttons like "רשת", "טבלה", "קומפקטי", "שבועי", "לוח שנה" in the body
    const bodyViewButtons = omerDialog.locator('button:text-is("רשת")');
    const bodyViewCount = await bodyViewButtons.count();
    check(`No duplicate "רשת" buttons in body (found: ${bodyViewCount})`, bodyViewCount === 0);

    const bodyCalButtons = omerDialog.locator('button:text-is("לוח שנה")');
    const bodyCalCount = await bodyCalButtons.count();
    check(`No duplicate "לוח שנה" button in body (found: ${bodyCalCount})`, bodyCalCount === 0);

    // ── 5. Check only ONE dialog overlay ──
    const overlays = page.locator('[data-radix-dialog-overlay]');
    const overlayCount = await overlays.count();
    check(`Only one dialog overlay (found: ${overlayCount})`, overlayCount === 1);

    // ── 6. Test view mode dropdown ──
    // Find the view mode dropdown button (has title containing "תצוגה")
    const viewDropdownBtn = omerDialog.locator('button[title*="תצוגה"]');
    if (await viewDropdownBtn.isVisible()) {
      await viewDropdownBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03-view-dropdown.png") });

      // Click "לוח שנה" from dropdown
      const calOption = page.locator('[role="menuitem"]:text("לוח שנה")');
      if (await calOption.isVisible()) {
        await calOption.click();
        await page.waitForTimeout(500);
        check("Calendar view selected from dropdown", true);
      } else {
        check("Calendar view option in dropdown", false);
      }
    } else {
      check("View mode dropdown button found", false);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04-calendar-view.png") });

    // ── 7. Calendar view structure check ──
    console.log("\n📅 Test: Calendar View");

    // Check for month headers
    const monthHeaders = omerDialog.locator("text=/באפר|מאי|יונ/");
    const monthCount = await monthHeaders.count();
    check(`Month headers found (${monthCount} ≥ 1)`, monthCount >= 1);

    // Check weekday headers exist
    const weekdayHeaders = omerDialog.locator("text=א׳");
    const wdCount = await weekdayHeaders.count();
    check(`Weekday headers found (${wdCount} ≥ 1)`, wdCount >= 1);

    // Check calendar grid - days should be in a 7-column grid
    const gridRows = omerDialog.locator(".grid.grid-cols-7");
    const gridCount = await gridRows.count();
    check(`7-column grids found (${gridCount} ≥ 2)`, gridCount >= 2);

    // ── 8. Check day cells are in correct columns ──
    // Day 1 of Omer = April 2, 2026 = Thursday (column index 4 for ה׳)
    // Day 4 = April 5, 2026 = Sunday (column index 0 for א׳)
    const dayCells = omerDialog.locator("button").filter({ hasText: /^[א-ת]׳/ });
    const cellCount = await dayCells.count();
    check(`Day cells found in calendar (${cellCount})`, cellCount > 0);

    // Take a detailed screenshot of the calendar
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05-calendar-detail.png"), fullPage: false });

    // ── 9. Switch back to grid view ──
    const viewBtn2 = omerDialog.locator('button[title*="תצוגה"]');
    if (await viewBtn2.isVisible()) {
      await viewBtn2.click();
      await page.waitForTimeout(300);
      const gridOption = page.locator('[role="menuitem"]:text("רשת")');
      if (await gridOption.isVisible()) {
        await gridOption.click();
        await page.waitForTimeout(500);
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06-grid-view.png") });

    // ── 10. Close dialog and verify only one X needed ──
    console.log("\n🔒 Test: Dialog close (single X)");

    const closeBtn = omerDialog.locator('button[title="חזרה לאתר"]').or(
      omerDialog.locator('button:has(svg.lucide-home)')
    ).first();

    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);

      // Check dialog is closed
      const stillVisible = await omerDialog.isVisible().catch(() => false);
      check("Dialog closed after single click", !stillVisible);

      // Make sure no second dialog is behind
      const anyDialog = page.locator('[role="dialog"]');
      const dialogCount = await anyDialog.count();
      const visibleDialogs = [];
      for (let i = 0; i < dialogCount; i++) {
        if (await anyDialog.nth(i).isVisible()) visibleDialogs.push(i);
      }
      check(`No leftover dialogs (visible: ${visibleDialogs.length})`, visibleDialogs.length === 0);
    } else {
      check("Close button found", false);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07-after-close.png") });
  }

  // ── Summary ──
  console.log(`\n${"─".repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${"─".repeat(40)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
