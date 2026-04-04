import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { getOmerBoardData } from "@/utils/omerUtils";
import { getCalendarPreference } from "@/utils/parshaUtils";

/* ─── Types ──────────────────────────────────────────────── */

const STORAGE_KEY = "omer_reminders_v1";

export type OmerChannel = "push" | "popup" | "whatsapp" | "email";

export interface OmerReminder {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  label: string;
  channels: OmerChannel[];
}

/* ─── Defaults ───────────────────────────────────────────── */

const makeId = () => Math.random().toString(36).slice(2, 10);

export function createOmerReminder(overrides?: Partial<OmerReminder>): OmerReminder {
  return {
    id: makeId(),
    enabled: true,
    hour: 20,
    minute: 0,
    message: "🕯️ זמן לספור ספירת העומר!",
    label: "תזכורת עומר",
    channels: ["push", "popup"],
    ...overrides,
  };
}

/* ─── Persistence (localStorage + Supabase) ──────────────── */

function loadLocal(): OmerReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return [];
}

function saveLocal(reminders: OmerReminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

async function saveToCloud(reminders: OmerReminder[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.auth.updateUser({
      data: { ...user.user_metadata, omer_reminders: reminders },
    });
  } catch { /* silent cloud sync failure */ }
}

async function loadFromCloud(): Promise<OmerReminder[] | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata?.omer_reminders) return null;
    return user.user_metadata.omer_reminders as OmerReminder[];
  } catch {
    return null;
  }
}

/* ─── Permission ─────────────────────────────────────────── */

async function requestPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted" ? "granted" : "denied";
  }
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/* ─── In-App Popup ───────────────────────────────────────── */

let _popupCallback: ((reminder: OmerReminder) => void) | null = null;

export function onOmerPopup(cb: (reminder: OmerReminder) => void) {
  _popupCallback = cb;
}

/* ─── Omer day info ──────────────────────────────────────── */

const OMER_BLESSING = "בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל סְפִירַת הָעוֹמֶר.";

function getTodayOmerText(): { dayLine: string; countText: string; blessing: string; sefira: string } | null {
  try {
    const board = getOmerBoardData(getCalendarPreference());
    if (!board.isInSeason || !board.currentDay) return null;
    const today = board.days.find((d) => d.isToday);
    if (!today) return null;
    return {
      dayLine: `היום ${today.hebrewDay} לעומר`,
      countText: today.countText,
      blessing: OMER_BLESSING,
      sefira: today.sefira,
    };
  } catch {
    return null;
  }
}

function buildOmerMessage(reminder: OmerReminder): string {
  const omer = getTodayOmerText();
  if (!omer) return reminder.message;
  return `${OMER_BLESSING}\n\n${omer.countText}\n\n${omer.sefira}\n\n${reminder.message}`;
}

/* ─── Delivery ───────────────────────────────────────────── */

function deliverReminder(reminder: OmerReminder) {
  const fullMessage = buildOmerMessage(reminder);
  const omer = getTodayOmerText();
  const title = omer ? `🕯️ ${omer.dayLine}` : "🕯️ ספירת העומר";

  // Push notification
  if (reminder.channels.includes("push")) {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title,
          body: fullMessage,
          smallIcon: "ic_launcher",
          largeIcon: "ic_launcher",
        }],
      }).catch(() => {});
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: fullMessage,
        icon: "/favicon.ico",
        dir: "rtl",
        lang: "he",
        tag: `omer-${reminder.id}`,
      });
    }
  }

  // In-app popup — pass enriched reminder with full text
  if (reminder.channels.includes("popup") && _popupCallback) {
    _popupCallback({ ...reminder, message: fullMessage });
  }

  // WhatsApp – open compose with full text
  if (reminder.channels.includes("whatsapp")) {
    const text = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  // Email – open mailto with full text
  if (reminder.channels.includes("email")) {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(fullMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }
}

/* ─── Native scheduling ─────────────────────────────────── */

async function scheduleNative(reminders: OmerReminder[]) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    // Cancel only omer-prefixed (IDs 5000-5999)
    const omerPending = pending.notifications.filter((n) => n.id >= 5000 && n.id < 6000);
    if (omerPending.length > 0) {
      await LocalNotifications.cancel({ notifications: omerPending });
    }

    const enabled = reminders.filter((r) => r.enabled && r.channels.includes("push"));
    if (enabled.length === 0) return;

    const notifications = enabled.map((r, idx) => {
      const now = new Date();
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), r.hour, r.minute, 0);
      if (scheduled.getTime() <= now.getTime()) {
        scheduled.setDate(scheduled.getDate() + 1);
      }
      return {
        id: 5000 + idx,
        title: "🕯️ ספירת העומר",
        body: r.message,
        schedule: { at: scheduled, every: "day" as const, allowWhileIdle: true },
        smallIcon: "ic_launcher",
        largeIcon: "ic_launcher",
      };
    });

    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn("Failed to schedule omer notifications:", e);
  }
}

/* ─── Browser polling ────────────────────────────────────── */

function checkBrowserReminders(reminders: OmerReminder[]) {
  if (Capacitor.isNativePlatform()) return;

  const now = new Date();
  for (const r of reminders) {
    if (!r.enabled) continue;
    const todayKey = `omer_sent_${r.id}_${now.toDateString()}`;
    if (localStorage.getItem(todayKey)) continue;

    const scheduledMs = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), r.hour, r.minute, 0
    ).getTime();

    if (now.getTime() >= scheduledMs) {
      deliverReminder(r);
      localStorage.setItem(todayKey, "1");
    }
  }
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useOmerReminders() {
  const [reminders, setReminders] = useState<OmerReminder[]>(() => loadLocal());
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (Capacitor.isNativePlatform()) return "default";
    return "Notification" in window ? Notification.permission : "denied";
  });
  const [supported] = useState(() => Capacitor.isNativePlatform() || "Notification" in window);
  const [popupReminder, setPopupReminder] = useState<OmerReminder | null>(null);

  // Popup callback
  useEffect(() => {
    onOmerPopup((r) => setPopupReminder(r));
    return () => { _popupCallback = null; };
  }, []);

  // Load from cloud on login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      loadFromCloud().then((cloud) => {
        if (cloud && cloud.length > 0) {
          setReminders(cloud);
          saveLocal(cloud);
        }
      });
    });
    // Also try loading immediately
    loadFromCloud().then((cloud) => {
      if (cloud && cloud.length > 0) {
        setReminders(cloud);
        saveLocal(cloud);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check permission on native
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.checkPermissions().then((r) => {
        setPermission(r.display === "granted" ? "granted" : "default");
      });
    }
  }, []);

  // Browser polling
  useEffect(() => {
    checkBrowserReminders(reminders);
    const onVis = () => {
      if (document.visibilityState === "visible") checkBrowserReminders(reminders);
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = setInterval(() => checkBrowserReminders(reminders), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(interval);
    };
  }, [reminders]);

  // Schedule native
  useEffect(() => {
    scheduleNative(reminders);
  }, [reminders]);

  // Persist helper
  const persist = useCallback((updated: OmerReminder[]) => {
    saveLocal(updated);
    saveToCloud(updated);
  }, []);

  const addReminder = useCallback((overrides?: Partial<OmerReminder>) => {
    setReminders((prev) => {
      const next = [...prev, createOmerReminder(overrides)];
      persist(next);
      return next;
    });
  }, [persist]);

  const updateReminder = useCallback((id: string, partial: Partial<OmerReminder>) => {
    setReminders((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...partial } : r));
      persist(next);
      return next;
    });
  }, [persist]);

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleChannel = useCallback((id: string, channel: OmerChannel) => {
    setReminders((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const channels = r.channels.includes(channel)
          ? r.channels.filter((c) => c !== channel)
          : [...r.channels, channel];
        return { ...r, channels };
      });
      persist(next);
      return next;
    });
  }, [persist]);

  const askPermission = useCallback(async () => {
    const result = await requestPermission();
    setPermission(result);
    return result;
  }, []);

  const sendTest = useCallback(() => {
    if (!supported) return;
    const testReminder: OmerReminder = {
      id: "test",
      enabled: true,
      hour: 0,
      minute: 0,
      message: "🕯️ זו התראת בדיקה לספירת העומר!",
      label: "בדיקה",
      channels: ["push", "popup"],
    };
    deliverReminder(testReminder);
  }, [supported]);

  const dismissPopup = useCallback(() => setPopupReminder(null), []);

  return {
    reminders,
    addReminder,
    updateReminder,
    removeReminder,
    toggleChannel,
    permission,
    askPermission,
    sendTest,
    supported,
    popupReminder,
    dismissPopup,
  };
}
