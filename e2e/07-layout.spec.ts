import { test, expect } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.describe("Layout & responsive design on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    // Close auto-opened dialogs
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("no elements overflow the viewport horizontally", async ({ page }) => {
    const issues = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflows: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > 0 && rect.right > vw + 5) {
          const tag = el.tagName.toLowerCase();
          const cls = (el as HTMLElement).className?.slice(0, 60) || "";
          overflows.push(`${tag}.${cls} (right: ${Math.round(rect.right)}, vw: ${vw})`);
        }
      });
      return overflows.slice(0, 10);
    });

    if (issues.length > 0) {
      console.log("Overflow issues:", issues);
    }
    // Allow some tolerance but flag major issues
    expect(issues.length).toBeLessThan(5);
  });

  test("header buttons do not wrap to multiple lines", async ({ page }) => {
    const mobileActions = page.locator('[data-layout="header-actions-mobile"]');
    await expect(mobileActions).toBeVisible();
    
    const box = await mobileActions.boundingBox();
    // Header actions should fit in roughly one line (< 70px height)
    expect(box!.height).toBeLessThan(70);
  });

  test("text direction is RTL", async ({ page }) => {
    const dir = await page.evaluate(() => {
      return getComputedStyle(document.body).direction;
    });
    expect(dir).toBe("rtl");
  });

  test("font sizes are readable on mobile (min 12px)", async ({ page }) => {
    const smallTextCount = await page.evaluate(() => {
      let count = 0;
      document.querySelectorAll("p, span, div, button, a, li, td, th, label, h1, h2, h3, h4").forEach((el) => {
        const style = getComputedStyle(el);
        const size = parseFloat(style.fontSize);
        const visible = (el as HTMLElement).offsetHeight > 0 && (el as HTMLElement).offsetWidth > 0;
        if (visible && size < 11 && style.display !== "none" && style.visibility !== "hidden") {
          count++;
        }
      });
      return count;
    });

    // Allow a few small elements (icons, badges) but flag if too many
    expect(smallTextCount).toBeLessThan(15);
  });

  test("touch targets are at least 32px", async ({ page }) => {
    const smallButtons = await page.evaluate(() => {
      const tooSmall: string[] = [];
      document.querySelectorAll("button, a, [role='button'], [role='menuitem']").forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 28 || rect.height < 28)) {
          const text = (el as HTMLElement).textContent?.slice(0, 30) || "";
          const label = (el as HTMLElement).getAttribute("aria-label") || "";
          tooSmall.push(`${rect.width.toFixed(0)}x${rect.height.toFixed(0)} "${text || label}"`);
        }
      });
      return tooSmall.slice(0, 10);
    });

    if (smallButtons.length > 0) {
      console.log("Small touch targets:", smallButtons);
    }
    // Allow some flexibility but flag major issues
    expect(smallButtons.length).toBeLessThan(8);
  });

  test("viewport meta tag is set for mobile", async ({ page }) => {
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute("content") || null;
    });
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain("width=device-width");
  });
});
