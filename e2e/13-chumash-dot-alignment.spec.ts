import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Chumash dot alignment + tracing", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const settings = JSON.stringify({ mode: "chumash", pasukCount: 20, loadMoreCount: 10 });
      localStorage.setItem("torah-display-settings-mobile", settings);
      localStorage.setItem("torah-display-settings", settings);
      localStorage.setItem("omer_popup_enabled_v1", "false");
      localStorage.setItem("debug_chumash_trace", "true");
      (window as Window & { __CHUMASH_TRACE__?: boolean }).__CHUMASH_TRACE__ = true;
    });

    await page.goto("/");
    await waitForAppReady(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  });

  test("content dot stays attached to the same pasuk entry", async ({ page }) => {
    await expect(page.locator('[data-chumash-item="pasuk"]').first()).toBeVisible();

    const mismatches = await page.evaluate(() => {
      const followingFlag = Node.DOCUMENT_POSITION_FOLLOWING;
      const dots = Array.from(document.querySelectorAll('[data-chumash-role="content-dot"]'));

      return dots
        .map((dot) => {
          const parent = dot.closest('[data-chumash-item="pasuk"]') as HTMLElement | null;
          const number = parent?.querySelector('[data-chumash-role="number"]') as HTMLElement | null;

          if (!parent || !number) {
            return {
              reason: "missing-parent-or-number",
              pasukId: parent?.getAttribute("data-pasuk-id") ?? null,
              pasukNum: parent?.getAttribute("data-pasuk-num") ?? null,
            };
          }

          const relation = number.compareDocumentPosition(dot);
          const numberBeforeDot = (relation & followingFlag) !== 0;

          if (!numberBeforeDot) {
            return {
              reason: "dot-not-after-number",
              pasukId: parent.getAttribute("data-pasuk-id"),
              pasukNum: parent.getAttribute("data-pasuk-num"),
            };
          }

          return null;
        })
        .filter(Boolean);
    });

    expect(mismatches).toEqual([]);
  });

  test("hover emits chumash trace for the same hovered pasuk", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      logs.push(msg.text());
    });

    const firstPasuk = page.locator('[data-chumash-item="pasuk"]').first();
    await expect(firstPasuk).toBeVisible();
    await firstPasuk.hover();
    await page.waitForTimeout(150);

    const hasTrace = logs.some((line) => line.includes("[ChumashTrace] hover"));
    expect(hasTrace).toBeTruthy();
  });
});
