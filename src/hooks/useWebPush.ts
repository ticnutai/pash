import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/* ─── VAPID Public Key ──────────────────────────────────── */

const VAPID_PUBLIC_KEY = "BLSFD4oodnVhrA9IGuDtvDvxqJI9U0E2dT30peC1dX5qwL8FPz_46n1TmNMjjnOeAETBavO_aLuobwXsl3D2L_Y";

/* ─── Types ─────────────────────────────────────────────── */

export interface PushReminder {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  type: "daily" | "omer";
  days?: number[]; // 0=Sun
}

export type WebPushState = "unsupported" | "prompt" | "granted" | "denied" | "subscribed";

/* ─── Helper: url-safe base64 → Uint8Array ──────────────── */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

/* ─── Call Supabase Edge Function ───────────────────────── */

async function callPushApi(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("push-subscribe", {
    body,
  });
  if (error) throw error;
  return data;
}

/* ─── Get subscription as plain object ──────────────────── */

function serializeSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    },
  };
}

/* ─── Hook ──────────────────────────────────────────────── */

export function useWebPush() {
  const [state, setState] = useState<WebPushState>("unsupported");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);

  /* ── Feature detect ──────────────────────────────────── */
  const isSupported =
    !Capacitor.isNativePlatform() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  /* ── Register SW & check existing subscription ───────── */
  useEffect(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/push-sw.js", {
          scope: "/",
        });
        swRegistration.current = reg;

        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          setSubscription(existingSub);
          setState("subscribed");
        } else {
          setState(Notification.permission === "denied" ? "denied" : "prompt");
        }
      } catch (err) {
        console.warn("Push SW registration failed:", err);
        setState("unsupported");
      }
    })();
  }, [isSupported]);

  /* ── Subscribe to push ───────────────────────────────── */
  const subscribe = useCallback(
    async (reminders: PushReminder[] = []) => {
      if (!swRegistration.current) return null;
      setLoading(true);

      try {
        // Request notification permission
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setState("denied");
          return null;
        }
        setState("granted");

        // Subscribe to Push Manager
        const sub = await swRegistration.current.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        setSubscription(sub);
        setState("subscribed");

        // Get current user ID if available
        let userId: string | undefined;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        } catch { /* anon is fine */ }

        // Save to Supabase
        await callPushApi({
          action: "subscribe",
          subscription: serializeSubscription(sub),
          reminders,
          userId,
        });

        return sub;
      } catch (err) {
        console.error("Push subscribe failed:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ── Unsubscribe ─────────────────────────────────────── */
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);

    try {
      const serialized = serializeSubscription(subscription);
      await subscription.unsubscribe();
      setSubscription(null);
      setState("prompt");

      // Remove from Supabase
      await callPushApi({
        action: "unsubscribe",
        subscription: serialized,
      });
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  /* ── Sync reminders to server ────────────────────────── */
  const syncReminders = useCallback(
    async (reminders: PushReminder[]) => {
      if (!subscription) return;

      try {
        await callPushApi({
          action: "update-reminders",
          subscription: serializeSubscription(subscription),
          reminders,
        });
      } catch (err) {
        console.error("Push sync reminders failed:", err);
      }
    },
    [subscription],
  );

  /* ── Send test push via server ───────────────────────── */
  const sendTestPush = useCallback(async () => {
    if (!subscription) return;

    try {
      await supabase.functions.invoke("send-push", {
        body: { test: true },
      });
    } catch (err) {
      console.error("Test push failed:", err);
    }
  }, [subscription]);

  return {
    state,
    isSupported,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    syncReminders,
    sendTestPush,
  };
}
