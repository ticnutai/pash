import { test, expect, Page } from "@playwright/test";
import { waitForAppReady } from "./helpers";

/**
 * Thorough E2E debugging of notification permissions on mobile:
 * - Does requesting permissions block page load?
 * - Does the page survive denied permissions?
 * - Does service worker registration failure crash the app?
 * - Do permission errors prevent the page from rendering?
 * - Stress tests with various permission states
 */

/** Collect console errors for debugging */
function collectErrors(page: Page): { errors: string[]; exceptions: string[] } {
  const errors: string[] = [];
  const exceptions: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    exceptions.push(error.message);
  });
  return { errors, exceptions };
}

test.describe("Notification Permissions - Page Load Blocking Debug", () => {

  test("page loads normally when Notification API is available (granted)", async ({ page, context }) => {
    // Grant notification permissions
    await context.grantPermissions(["notifications"]);

    const { errors, exceptions } = collectErrors(page);

    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Page load time (notifications=granted): ${loadTime}ms`);
    console.log(`[DEBUG] Console errors: ${errors.length}`);
    console.log(`[DEBUG] Exceptions: ${exceptions.length}`);

    // Page should load within 15 seconds
    expect(loadTime).toBeLessThan(15_000);

    // Header should be visible
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Log permission-related errors
    const permErrors = errors.filter((e) =>
      e.includes("permission") || e.includes("Notification") || e.includes("push") || e.includes("service")
    );
    if (permErrors.length > 0) {
      console.log("[DEBUG] Permission-related errors:", permErrors);
    }
  });

  test("page loads normally when notifications are DENIED", async ({ page, context }) => {
    // Deny all notification permissions
    await context.clearPermissions();

    const { errors, exceptions } = collectErrors(page);

    // Override Notification.permission to "denied"
    await page.addInitScript(() => {
      Object.defineProperty(window, "Notification", {
        value: class MockNotification {
          static permission = "denied";
          static requestPermission() { return Promise.resolve("denied"); }
          constructor() { throw new Error("Notifications denied"); }
        },
        writable: true,
        configurable: true,
      });
    });

    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Page load time (notifications=denied): ${loadTime}ms`);
    console.log(`[DEBUG] Console errors: ${errors.length}`);
    console.log(`[DEBUG] Exceptions: ${exceptions.length}`);

    // Page MUST still load even with denied permissions
    expect(loadTime).toBeLessThan(15_000);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // No uncaught exceptions should crash the app
    const criticalExceptions = exceptions.filter((e) =>
      !e.includes("Notifications denied") && // Our mock error
      !e.includes("push-sw") // Service worker expected to fail
    );
    if (criticalExceptions.length > 0) {
      console.log("[DEBUG] CRITICAL uncaught exceptions:", criticalExceptions);
    }
    expect(criticalExceptions.length).toBe(0);
  });

  test("page loads when Notification API doesn't exist at all", async ({ page }) => {
    const { errors, exceptions } = collectErrors(page);

    // Remove Notification API entirely (like in some mobile browsers)
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.Notification;
    });

    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Page load time (no Notification API): ${loadTime}ms`);

    expect(loadTime).toBeLessThan(15_000);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    if (exceptions.length > 0) {
      console.log("[DEBUG] Exceptions without Notification API:", exceptions);
    }
    expect(exceptions.length).toBe(0);
  });

  test("page loads when service worker registration fails", async ({ page }) => {
    const { errors, exceptions } = collectErrors(page);

    // Make service worker registration fail
    await page.addInitScript(() => {
      if ("serviceWorker" in navigator) {
        const origRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
        navigator.serviceWorker.register = () => {
          console.warn("[E2E Mock] Service worker registration blocked");
          return Promise.reject(new Error("E2E: SW registration blocked"));
        };
      }
    });

    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Page load time (SW registration blocked): ${loadTime}ms`);

    expect(loadTime).toBeLessThan(15_000);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Content should still load
    const verseCards = page.locator('[data-layout="verse-cards"]');
    await expect(verseCards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("page loads when requestPermission hangs indefinitely", async ({ page }) => {
    const { errors, exceptions } = collectErrors(page);

    // Make requestPermission hang (never resolves)
    await page.addInitScript(() => {
      if ("Notification" in window) {
        const OrigNotification = window.Notification;
        Object.defineProperty(window, "Notification", {
          value: class HangingNotification extends OrigNotification {
            static get permission() { return "default"; }
            static requestPermission() {
              console.log("[E2E Mock] requestPermission called - hanging...");
              return new Promise(() => {}); // Never resolves
            }
          },
          writable: true,
          configurable: true,
        });
      }
    });

    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Page load time (hanging permission): ${loadTime}ms`);

    // The page MUST load even if requestPermission hangs
    expect(loadTime).toBeLessThan(15_000);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Navigate and interact - app should still be functional
    await page.keyboard.press("Escape"); // dismiss any dialog
    await page.waitForTimeout(500);

    const verseCards = page.locator('[data-layout="verse-cards"]');
    await expect(verseCards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("page loads when requestPermission throws an error", async ({ page }) => {
    const { errors, exceptions } = collectErrors(page);

    await page.addInitScript(() => {
      Object.defineProperty(window, "Notification", {
        value: class ThrowingNotification {
          static permission = "default";
          static requestPermission() {
            return Promise.reject(new Error("NotAllowedError: Permission request blocked"));
          }
          constructor() {
            throw new Error("NotAllowedError");
          }
        },
        writable: true,
        configurable: true,
      });
    });

    const start = Date.now();
    await page.goto("/");
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Page load time (throwing permission): ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15_000);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Filter out expected mock errors
    const realExceptions = exceptions.filter((e) =>
      !e.includes("NotAllowedError") && !e.includes("Permission request blocked")
    );
    expect(realExceptions.length).toBe(0);
  });
});

test.describe("Notification Permission - Repeated Load Stress Test", () => {

  test("page loads 5 times in a row without notification issues", async ({ page }) => {
    const allErrors: string[] = [];
    const allExceptions: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") allErrors.push(msg.text());
    });
    page.on("pageerror", (error) => allExceptions.push(error.message));

    const loadTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await page.goto("/");
      await waitForAppReady(page);
      loadTimes.push(Date.now() - start);

      // Dismiss any dialogs
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify app is functional
      await expect(page.locator('[data-layout="header"]')).toBeVisible();
    }

    console.log(`[DEBUG] Load times over 5 reloads: ${loadTimes.map((t) => t + "ms").join(", ")}`);

    // No load should take longer than 15s
    for (const t of loadTimes) {
      expect(t).toBeLessThan(15_000);
    }

    // Check if load times are degrading (could indicate memory leak or accumulating handlers)
    const avgFirst2 = (loadTimes[0] + loadTimes[1]) / 2;
    const avgLast2 = (loadTimes[3] + loadTimes[4]) / 2;
    const degradation = avgLast2 / avgFirst2;
    console.log(`[DEBUG] Load time degradation ratio: ${degradation.toFixed(2)}x`);

    // Should not degrade more than 3x
    expect(degradation).toBeLessThan(3);

    // Log accumulated errors
    const permErrors = allErrors.filter((e) =>
      e.includes("permission") || e.includes("Notification") || e.includes("push") || e.includes("serviceWorker")
    );
    if (permErrors.length > 0) {
      console.log(`[DEBUG] Permission-related errors across 5 loads: ${permErrors.length}`);
      console.log(permErrors.slice(0, 10));
    }

    if (allExceptions.length > 0) {
      console.log(`[DEBUG] Total uncaught exceptions across 5 loads: ${allExceptions.length}`);
      console.log(allExceptions.slice(0, 10));
    }
  });

  test("page loads fine after clearing all localStorage (fresh user)", async ({ page }) => {
    const { errors, exceptions } = collectErrors(page);

    // Clear everything to simulate fresh user
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const start = Date.now();
    await page.reload();
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    console.log(`[DEBUG] Fresh user load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15_000);
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Check what auto-enable notifications did
    const storageState = await page.evaluate(() => {
      return {
        dailyReminders: localStorage.getItem("dailyLearningReminders_v2"),
        omerReminders: localStorage.getItem("omer_reminders_v1"),
        firstInstall: localStorage.getItem("app_first_install_done"),
        omerAutoOpen: localStorage.getItem("omer-auto-open"),
        dailyPermRequested: localStorage.getItem("daily_notifications_permission_auto_requested_v1"),
        omerPermRequested: localStorage.getItem("omer_notifications_permission_auto_requested_v1"),
      };
    });

    console.log("[DEBUG] Storage state after fresh load:", storageState);

    if (exceptions.length > 0) {
      console.log("[DEBUG] Exceptions on fresh load:", exceptions);
    }
    expect(exceptions.length).toBe(0);
  });
});

test.describe("Notification + Omer Combined Stress", () => {

  test("Omer dialog + notification hooks don't block each other", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Omer") || msg.text().includes("reminder") || msg.text().includes("permission") || msg.text().includes("push")) {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto("/");
    await waitForAppReady(page);

    // Wait for Omer dialog + notification hooks to initialize
    await page.waitForTimeout(3000);

    // Verify app is interactive (not blocked)
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Try interacting while notification hooks are running
    await page.keyboard.press("Escape"); // close omer
    await page.waitForTimeout(500);

    // Navigate sefarim
    const selector = page.locator('[data-layout="sefer-selector"]');
    if (await selector.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const firstBtn = selector.locator("button").first();
      if (await firstBtn.isVisible()) {
        await firstBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // App still responsive
    await expect(page.locator('[data-layout="header"]')).toBeVisible();

    // Log notification-related activity
    if (logs.length > 0) {
      console.log(`[DEBUG] Notification/Omer logs (${logs.length} total):`);
      logs.slice(0, 30).forEach((l) => console.log(`  ${l}`));
    }
  });

  test("web push service worker init doesn't block page render", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("webPush") || msg.text().includes("push-sw") || msg.text().includes("serviceWorker")) {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    const start = Date.now();
    await page.goto("/");
    
    // Check that #root appears quickly (before service worker finishes)
    await page.waitForSelector("#root", { timeout: 5_000 });
    const rootTime = Date.now() - start;
    console.log(`[DEBUG] #root appeared in ${rootTime}ms`);
    expect(rootTime).toBeLessThan(5_000);

    // Wait for full app
    await waitForAppReady(page);
    const fullTime = Date.now() - start;
    console.log(`[DEBUG] Full app ready in ${fullTime}ms`);

    if (logs.length > 0) {
      console.log("[DEBUG] Push/SW logs:", logs.slice(0, 20));
    }
  });

  test("notification polling doesn't cause memory leaks or performance issues", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Get active timer count (intervals/timeouts)
    const initialTimers = await page.evaluate(() => {
      // Count active setInterval handles (approximate)
      let count = 0;
      const id = setInterval(() => {}, 100000);
      clearInterval(id);
      // The id gives us an approximate count of active timers
      return { intervalId: id };
    });

    console.log(`[DEBUG] Timer counter after load: ${JSON.stringify(initialTimers)}`);

    // Navigate away and back to check cleanup
    await page.goto("/siddur");
    await page.waitForTimeout(2000);
    await page.goto("/");
    await waitForAppReady(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const afterTimers = await page.evaluate(() => {
      const id = setInterval(() => {}, 100000);
      clearInterval(id);
      return { intervalId: id };
    });

    console.log(`[DEBUG] Timer counter after navigate: ${JSON.stringify(afterTimers)}`);

    // Timer IDs shouldn't grow excessively (would indicate leaked intervals)
    const timerGrowth = afterTimers.intervalId - initialTimers.intervalId;
    console.log(`[DEBUG] Timer growth: ${timerGrowth}`);
    // Allow some growth for React re-renders but not excessive
    expect(timerGrowth).toBeLessThan(50);
  });
});
