/**
 * Web Push Service — singleton that manages VAPID push subscription.
 *
 * Can be called from any module (hooks, event handlers, etc.).
 * Automatically subscribes the browser to Web Push when a reminder
 * with "push" channel is enabled, and syncs reminders to the server
 * so they are delivered even when the browser tab is closed.
 */
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/* ─── VAPID Public Key ──────────────────────────────────── */
const DEFAULT_VAPID_PUBLIC_KEY =
  "BLSFD4oodnVhrA9IGuDtvDvxqJI9U0E2dT30peC1dX5qwL8FPz_46n1TmNMjjnOeAETBavO_aLuobwXsl3D2L_Y";

/** Read VAPID public key — user-supplied (Settings → API) takes priority */
function getVapidPublicKey(): string {
  try {
    const custom = localStorage.getItem("api_vapid_public_key");
    if (custom && custom.length > 20) return custom;
  } catch { /* ignore */ }
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/* ─── Types ─────────────────────────────────────────────── */
export interface ServerReminder {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  type: "daily" | "omer";
  days?: number[];
}

/* ─── Internal state ────────────────────────────────────── */
let _registration: ServiceWorkerRegistration | null = null;
let _subscription: PushSubscription | null = null;
let _initPromise: Promise<void> | null = null;

/* ─── Helpers ───────────────────────────────────────────── */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray as Uint8Array<ArrayBuffer>;
}

function serializeSub(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
  };
}

async function callPushApi(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("push-subscribe", { body });
  if (error) throw error;
  return data;
}

/* ─── Public API ────────────────────────────────────────── */

/** Is Web Push available on this platform? */
export function isWebPushSupported(): boolean {
  return (
    !Capacitor.isNativePlatform() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Initialise the push service worker (idempotent). */
export function init(): Promise<void> {
  if (_initPromise) return _initPromise;
  if (!isWebPushSupported()) return Promise.resolve();

  _initPromise = (async () => {
    try {
      _registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      _subscription = await _registration.pushManager.getSubscription();
    } catch (err) {
      console.warn("[webPushService] init failed:", err);
    }
  })();
  return _initPromise;
}

/** True when the browser already has an active push subscription. */
export function isSubscribed(): boolean {
  return _subscription !== null;
}

/**
 * Ensure the browser is subscribed to Web Push.
 * Requests notification permission if needed.
 * Returns the subscription, or null on failure.
 */
export async function ensureSubscribed(): Promise<PushSubscription | null> {
  await init();
  if (_subscription) return _subscription;
  if (!_registration) return null;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;

  try {
    _subscription = await _registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
    });

    let userId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch { /* anon is fine */ }

    await callPushApi({
      action: "subscribe",
      subscription: serializeSub(_subscription),
      reminders: [],
      userId,
    });

    return _subscription;
  } catch (err) {
    console.error("[webPushService] subscribe failed:", err);
    return null;
  }
}

/**
 * Sync the given reminders to the push server.
 * Automatically subscribes if not already.
 */
export async function syncReminders(reminders: ServerReminder[]): Promise<void> {
  if (!isWebPushSupported()) return;

  const sub = await ensureSubscribed();
  if (!sub) return;

  try {
    await callPushApi({
      action: "update-reminders",
      subscription: serializeSub(sub),
      reminders,
    });
    console.log("[webPushService] synced", reminders.length, "reminders to push server");
  } catch (err) {
    console.error("[webPushService] sync failed:", err);
  }
}

/** Unsubscribe from Web Push entirely. */
export async function unsubscribe(): Promise<void> {
  if (!_subscription) return;
  try {
    const serialized = serializeSub(_subscription);
    await _subscription.unsubscribe();
    _subscription = null;
    await callPushApi({ action: "unsubscribe", subscription: serialized });
  } catch (err) {
    console.error("[webPushService] unsubscribe failed:", err);
  }
}
