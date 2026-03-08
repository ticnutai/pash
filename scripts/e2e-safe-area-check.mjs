import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5001";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(page, retries = 20) {
  let lastError;
  for (let i = 0; i < retries; i += 1) {
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 5000 });
      return;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }
  throw new Error(`Dev server did not become reachable at ${BASE_URL}. Last error: ${lastError}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 851 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; 2107113SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await waitForServer(page);

    await page.waitForSelector("#root", { timeout: 15000 });

    // Positive case: emulate bottom system bar inset and dispatch native-like update event.
    const positive = await page.evaluate(() => {
      document.documentElement.style.setProperty("--safe-area-inset-bottom", "48px");
      window.dispatchEvent(new CustomEvent("safeAreaUpdated", { detail: { bottom: 48 } }));

      const hasClass = document.body.classList.contains("has-bottom-system-bar");
      const rootPaddingBottom = getComputedStyle(document.getElementById("root")).paddingBottom;
      const overlayHeight = getComputedStyle(document.body, "::after").height;
      const overlayContent = getComputedStyle(document.body, "::after").content;

      return { hasClass, rootPaddingBottom, overlayHeight, overlayContent };
    });

    assert(positive.hasClass, "Expected body to have has-bottom-system-bar class when inset > 0");
    assert(positive.rootPaddingBottom === "48px", `Expected #root padding-bottom to be 48px, got ${positive.rootPaddingBottom}`);
    assert(positive.overlayHeight === "48px", `Expected body::after height to be 48px, got ${positive.overlayHeight}`);
    assert(positive.overlayContent !== "none", "Expected body::after overlay to exist when inset > 0");

    // Negative case: clear inset and ensure class is removed.
    const negative = await page.evaluate(() => {
      document.documentElement.style.setProperty("--safe-area-inset-bottom", "0px");
      window.dispatchEvent(new CustomEvent("safeAreaUpdated", { detail: { bottom: 0 } }));

      const hasClass = document.body.classList.contains("has-bottom-system-bar");
      const rootPaddingBottom = getComputedStyle(document.getElementById("root")).paddingBottom;

      return { hasClass, rootPaddingBottom };
    });

    assert(!negative.hasClass, "Expected body has-bottom-system-bar class to be removed when inset = 0");
    assert(negative.rootPaddingBottom === "0px", `Expected #root padding-bottom to reset to 0px, got ${negative.rootPaddingBottom}`);

    console.log("E2E_SAFE_AREA_CHECK: PASS");
    console.log(`Positive case: ${JSON.stringify(positive)}`);
    console.log(`Negative case: ${JSON.stringify(negative)}`);
  } catch (error) {
    console.error("E2E_SAFE_AREA_CHECK: FAIL");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
