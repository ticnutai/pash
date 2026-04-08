// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import webPush from "npm:web-push@3.6.7";

/**
 * Sends Web Push notifications to subscribers whose reminders match the current time.
 * Should be called every minute by pg_cron or an external scheduler.
 *
 * Required env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:torahapp@example.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase secrets.");
    }

    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if this is a test/immediate push request
    let isTest = false;
    try {
      const body = await req.json();
      isTest = body?.test === true;
    } catch { /* no body = scheduled run */ }

    // Get current time in Israel timezone
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }),
    );
    const currentHour = nowIST.getHours();
    const currentMinute = nowIST.getMinutes();
    const currentDay = nowIST.getDay(); // 0=Sun

    console.log(`Push check: ${currentHour}:${String(currentMinute).padStart(2, "0")} IST, day=${currentDay}, test=${isTest}`);

    // Fetch all active subscriptions
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return jsonResponse({ sent: 0, message: "No subscriptions" });
    }

    let sentCount = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subs) {
      const reminders: Reminder[] = sub.reminders || [];

      // In test mode: send a test notification to every subscription (no time check)
      if (isTest) {
        const payload = JSON.stringify({
          title: "🔔 בדיקת התראות",
          body: `התראת בדיקה - ${currentHour}:${String(currentMinute).padStart(2, "0")} שעון ישראל`,
          icon: "/icon-192x192.png",
          tag: `push-test-${Date.now()}`,
          type: "test",
          reminderId: "test",
          url: "/",
        });

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        };

        try {
          await webPush.sendNotification(pushSubscription, payload, { TTL: 300, urgency: "high" });
          sentCount++;
        } catch (pushErr: any) {
          console.error(`Test push failed for ${sub.endpoint.slice(0, 50)}:`, pushErr.statusCode, pushErr.body);
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          }
        }
        continue;
      }

      for (const reminder of reminders) {
        if (!reminder.enabled) continue;
        if (reminder.hour !== currentHour || reminder.minute !== currentMinute) continue;
        if (reminder.days?.length > 0 && !reminder.days.includes(currentDay)) continue;

        // Build notification payload
        const payload = JSON.stringify({
          title: reminder.type === "omer"
            ? "ספירת העומר - תזכורת"
            : "חמישה חומשי תורה עם פירושים",
          body: reminder.message || "זמן ללמוד תורה! 📖",
          icon: "/icon-192x192.png",
          tag: `push-${reminder.id}`,
          type: reminder.type || "daily",
          reminderId: reminder.id,
          url: "/",
        });

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        };

        try {
          await webPush.sendNotification(pushSubscription, payload, {
            TTL: 86400, // 24 hours
            urgency: "normal",
          });
          sentCount++;
        } catch (pushErr: any) {
          console.error(`Push failed for ${sub.endpoint.slice(0, 50)}:`, pushErr.statusCode, pushErr.body);
          // 404 or 410 = subscription expired
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          }
        }

        // Only send one notification per subscription per check cycle
        break;
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
      console.log(`Cleaned ${staleEndpoints.length} stale subscriptions`);
    }

    return jsonResponse({
      sent: sentCount,
      total: subs.length,
      cleaned: staleEndpoints.length,
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* ── helpers ───────────────────── */

interface Reminder {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  type?: "daily" | "omer";
  days?: number[];
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
