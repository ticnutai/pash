#!/usr/bin/env node
/**
 * E2E Push Notification Test
 *
 * Tests the complete Web Push flow:
 * 1. Checks existing subscriptions in Supabase
 * 2. Sends an immediate test push directly via web-push library
 * 3. Schedules a timed reminder for N minutes from now
 * 4. Calls the send-push edge function to verify scheduled delivery
 *
 * Usage:
 *   node scripts/e2e-push-test.mjs [--minutes 3] [--direct-only] [--schedule-only]
 *
 * Prerequisites:
 *   - npm install web-push (dev dependency)
 *   - At least one browser must be subscribed to push (open the app and enable push)
 */

import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

/* ─── Configuration ─────────────────────────────────────── */
const SUPABASE_URL = "https://mocukhvfqqzkekphifsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY3VraHZmcXF6a2VrcGhpZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQ5MDgsImV4cCI6MjA4MDE2MDkwOH0.7whrGNQK4_ByacsLF4qWn3lObBL9bQyhy1vk6C4KxQw";

const VAPID_PUBLIC_KEY =
  "BLSFD4oodnVhrA9IGuDtvDvxqJI9U0E2dT30peC1dX5qwL8FPz_46n1TmNMjjnOeAETBavO_aLuobwXsl3D2L_Y";
const VAPID_PRIVATE_KEY = "MmrMQnBStp9ZBgciMuWWa1E3dFJ7f6JO1H2WUMl_2dI";
const VAPID_SUBJECT = "mailto:jj1212t@gmail.com";

/* ─── Parse CLI Args ────────────────────────────────────── */
const args = process.argv.slice(2);
const minutesIdx = args.indexOf("--minutes");
const DELAY_MINUTES = minutesIdx >= 0 ? parseInt(args[minutesIdx + 1], 10) : 3;
const DIRECT_ONLY = args.includes("--direct-only");
const SCHEDULE_ONLY = args.includes("--schedule-only");

/* ─── Setup ─────────────────────────────────────────────── */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function israelTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function log(msg) {
  const now = israelTime();
  console.log(`[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} IST] ${msg}`);
}

/* ─── Step 1: Check subscriptions ───────────────────────── */
async function getSubscriptions() {
  log("📡 Fetching push subscriptions from Supabase...");
  const { data, error } = await supabase.from("push_subscriptions").select("*");

  if (error) {
    log(`❌ Error fetching subscriptions: ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) {
    log("⚠️  No push subscriptions found!");
    log("");
    log("═══════════════════════════════════════════════════════════");
    log("  To subscribe, open the app in Chrome and enable push:");
    log("  1. Run: npm run dev");
    log("  2. Open: http://localhost:5173");
    log("  3. Go to Settings → Notifications → Enable Web Push");
    log("  4. Re-run this script");
    log("═══════════════════════════════════════════════════════════");
    return [];
  }

  log(`✅ Found ${data.length} subscription(s)`);
  for (const sub of data) {
    log(`   → endpoint: ${sub.endpoint.slice(0, 60)}...`);
    log(`     reminders: ${JSON.stringify(sub.reminders?.length || 0)} configured`);
  }
  return data;
}

/* ─── Step 2: Send direct test push ─────────────────────── */
async function sendDirectPush(subs) {
  log("");
  log("🚀 PHASE 1: Sending IMMEDIATE test push directly via web-push...");
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const payload = JSON.stringify({
      title: "🔔 בדיקת E2E - ישירה",
      body: `הודעת בדיקה נשלחה ישירות ב-${pad(israelTime().getHours())}:${pad(israelTime().getMinutes())}`,
      icon: "/icon-192x192.png",
      tag: `e2e-direct-${Date.now()}`,
      type: "test",
      reminderId: "e2e-direct",
      url: "/",
    });

    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
    };

    try {
      const result = await webPush.sendNotification(pushSub, payload, {
        TTL: 300,
        urgency: "high",
      });
      log(`   ✅ Push sent! Status: ${result.statusCode}`);
      sent++;
    } catch (err) {
      log(`   ❌ Push failed: ${err.statusCode || err.message}`);
      if (err.statusCode === 404 || err.statusCode === 410) {
        log("      ↳ Subscription expired — needs re-subscribe");
      }
      failed++;
    }
  }

  log(`   📊 Results: ${sent} sent, ${failed} failed`);
  return sent > 0;
}

/* ─── Step 3: Schedule timed reminder ───────────────────── */
async function scheduleTimedReminder(subs) {
  const now = israelTime();
  const targetTime = new Date(now.getTime() + DELAY_MINUTES * 60 * 1000);
  const targetHour = targetTime.getHours();
  const targetMinute = targetTime.getMinutes();

  log("");
  log(`⏰ PHASE 2: Scheduling reminder for ${pad(targetHour)}:${pad(targetMinute)} IST (in ~${DELAY_MINUTES} min)...`);

  const testReminder = {
    id: "e2e-test-scheduled",
    enabled: true,
    hour: targetHour,
    minute: targetMinute,
    message: `תזכורת בדיקת E2E — נוצרה ב-${pad(now.getHours())}:${pad(now.getMinutes())} ותזמנה ל-${pad(targetHour)}:${pad(targetMinute)} 🎯`,
    type: "daily",
    days: [0, 1, 2, 3, 4, 5, 6], // all days
  };

  for (const sub of subs) {
    // Preserve existing reminders and add test one
    const existingReminders = (sub.reminders || []).filter((r) => r.id !== "e2e-test-scheduled");
    const newReminders = [...existingReminders, testReminder];

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ reminders: newReminders, updated_at: new Date().toISOString() })
      .eq("endpoint", sub.endpoint);

    if (error) {
      log(`   ❌ Failed to update subscription: ${error.message}`);
    } else {
      log(`   ✅ Reminder set for ${sub.endpoint.slice(0, 50)}...`);
      log(`      Total reminders: ${newReminders.length}`);
    }
  }

  return { targetHour, targetMinute };
}

/* ─── Step 4: Poll send-push edge function ──────────────── */
async function pollSendPush(targetHour, targetMinute) {
  log("");
  log(`🔄 PHASE 3: Polling send-push edge function every 30s until ${pad(targetHour)}:${pad(targetMinute)}...`);
  log("   (The edge function checks if current time matches configured reminders)");
  log("");

  const maxAttempts = DELAY_MINUTES * 3 + 4; // extra buffer
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    const now = israelTime();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    log(`   [Attempt ${attempt}/${maxAttempts}] Current time: ${pad(currentH)}:${pad(currentM)}, target: ${pad(targetHour)}:${pad(targetMinute)}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (result.sent > 0) {
        log(`   🎉 SUCCESS! ${result.sent} notification(s) sent via edge function!`);
        return true;
      } else {
        log(`   ⏳ No match yet (sent: ${result.sent}, total subs: ${result.total})`);
      }
    } catch (err) {
      log(`   ⚠️  Edge function call failed: ${err.message}`);
    }

    // Wait 30 seconds
    await new Promise((r) => setTimeout(r, 30_000));
  }

  log("   ⏰ Timeout reached. The scheduled notification may fire on the next matching minute.");
  return false;
}

/* ─── Step 5: Cleanup test reminder ─────────────────────── */
async function cleanupTestReminder(subs) {
  log("");
  log("🧹 Cleaning up test reminders...");

  for (const sub of subs) {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("reminders")
      .eq("endpoint", sub.endpoint)
      .single();

    if (data) {
      const cleaned = (data.reminders || []).filter((r) => r.id !== "e2e-test-scheduled");
      await supabase
        .from("push_subscriptions")
        .update({ reminders: cleaned })
        .eq("endpoint", sub.endpoint);
    }
  }
  log("   ✅ Test reminders removed");
}

/* ─── Main ──────────────────────────────────────────────── */
async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║          E2E Web Push Notification Test                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  const subs = await getSubscriptions();
  if (subs.length === 0) {
    process.exit(1);
  }

  let directOk = false;
  let scheduledOk = false;

  // Phase 1: Direct push
  if (!SCHEDULE_ONLY) {
    directOk = await sendDirectPush(subs);
  }

  // Phase 2 & 3: Scheduled push
  if (!DIRECT_ONLY) {
    const { targetHour, targetMinute } = await scheduleTimedReminder(subs);
    scheduledOk = await pollSendPush(targetHour, targetMinute);
    await cleanupTestReminder(subs);
  }

  // Summary
  log("");
  log("═══════════════════════════════════════════════════════════");
  log("  📋 E2E TEST SUMMARY:");
  if (!SCHEDULE_ONLY) {
    log(`  ${directOk ? "✅" : "❌"} Direct push (immediate)  — ${directOk ? "PASSED" : "FAILED"}`);
  }
  if (!DIRECT_ONLY) {
    log(`  ${scheduledOk ? "✅" : "❌"} Scheduled push (${DELAY_MINUTES}min) — ${scheduledOk ? "PASSED" : "FAILED"}`);
  }
  log("═══════════════════════════════════════════════════════════");

  const allPassed = (SCHEDULE_ONLY || directOk) && (DIRECT_ONLY || scheduledOk);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  log(`💥 Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
