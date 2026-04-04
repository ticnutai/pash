import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/* ─── Types ──────────────────────────────────────────────── */

const STORAGE_KEY = "dailyLearningReminders_v2";
const FIRST_INSTALL_KEY = "app_first_install_done";

export interface SingleReminder {
  id: string;          // unique id
  enabled: boolean;
  hour: number;        // 0-23
  minute: number;      // 0-59
  message: string;
  label: string;       // user-friendly name
  days: number[];      // 0=Sun … 6=Sat, empty = every day
  popup: boolean;      // show in-app popup
  sound: boolean;
}

export interface ReminderSettings {
  /** kept for backwards compat – mirrors first reminder */
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  /** new multi-reminder list */
  reminders: SingleReminder[];
}

/* ─── Defaults ───────────────────────────────────────────── */

const makeId = () => Math.random().toString(36).slice(2, 10);

export function createDefaultReminder(overrides?: Partial<SingleReminder>): SingleReminder {
  return {
    id: makeId(),
    enabled: true,
    hour: 7,
    minute: 0,
    message: "זמן ללמוד תורה! 📖",
    label: "תזכורת לימוד",
    days: [],
    popup: true,
    sound: true,
    ...overrides,
  };
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 7,
  minute: 0,
  message: "זמן ללמוד תורה! 📖",
  reminders: [],
};

/* ─── Persistence ────────────────────────────────────────── */

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    // migrate v1
    const v1 = localStorage.getItem("dailyLearningReminder");
    if (v1) {
      const old = JSON.parse(v1) as { enabled: boolean; hour: number; minute: number; message: string };
      const migrated: ReminderSettings = {
        ...old,
        reminders: old.enabled
          ? [createDefaultReminder({ enabled: true, hour: old.hour, minute: old.minute, message: old.message })]
          : [],
      };
      saveReminderSettings(migrated);
      return migrated;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/* ─── Auto-enable on first install ───────────────────────── */

function maybeAutoEnable(): ReminderSettings {
  const done = localStorage.getItem(FIRST_INSTALL_KEY);
  if (done) return loadReminderSettings();

  localStorage.setItem(FIRST_INSTALL_KEY, "1");
  const settings: ReminderSettings = {
    enabled: true,
    hour: 7,
    minute: 0,
    message: "זמן ללמוד תורה! 📖",
    reminders: [
      createDefaultReminder({ label: "תזכורת בוקר", hour: 7, minute: 0 }),
      createDefaultReminder({ label: "תזכורת ערב", hour: 20, minute: 0, message: "ערב טוב! זמן לחזור וללמוד 📖" }),
    ],
  };
  saveReminderSettings(settings);
  return settings;
}

/* ─── Permission ─────────────────────────────────────────── */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted" ? "granted" : "denied";
  }
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/* ─── In-App Popup ───────────────────────────────────────── */

let _popupCallback: ((reminder: SingleReminder) => void) | null = null;

export function onReminderPopup(cb: (reminder: SingleReminder) => void) {
  _popupCallback = cb;
}

function triggerPopup(reminder: SingleReminder) {
  if (_popupCallback) _popupCallback(reminder);
}

/* ─── Native (Capacitor) local notifications ─────────────── */

async function scheduleNativeNotifications(reminders: SingleReminder[]) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    const enabled = reminders.filter((r) => r.enabled);
    if (enabled.length === 0) return;

    const notifications = enabled.map((r, idx) => {
      const now = new Date();
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), r.hour, r.minute, 0);
      if (scheduled.getTime() <= now.getTime()) {
        scheduled.setDate(scheduled.getDate() + 1);
      }
      return {
        id: idx + 1,
        title: "חמישה חומשי תורה עם פירושים",
        body: r.message,
        schedule: {
          at: scheduled,
          every: "day" as const,
          allowWhileIdle: true,
        },
        sound: r.sound ? undefined : null,
        smallIcon: "ic_launcher",
        largeIcon: "ic_launcher",
      };
    });

    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn("Failed to schedule native notifications:", e);
  }
}

/* ─── Browser web notification check ─────────────────────── */

function maybeSendBrowserNotifications(reminders: SingleReminder[]) {
  if (Capacitor.isNativePlatform()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const dayOfWeek = now.getDay();

  for (const r of reminders) {
    if (!r.enabled) continue;
    if (r.days.length > 0 && !r.days.includes(dayOfWeek)) continue;

    const todayKey = `reminder_sent_${r.id}_${now.toDateString()}`;
    if (localStorage.getItem(todayKey)) continue;

    const scheduledMs = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), r.hour, r.minute, 0
    ).getTime();

    if (now.getTime() >= scheduledMs) {
      new Notification("חמישה חומשי תורה עם פירושים", {
        body: r.message,
        icon: "/favicon.ico",
        dir: "rtl",
        lang: "he",
        tag: r.id,
      });
      localStorage.setItem(todayKey, "1");

      if (r.popup) triggerPopup(r);
    }
  }
}

/* legacy compat */
function maybeSendDailyNotification(settings: ReminderSettings) {
  if (settings.reminders.length > 0) {
    maybeSendBrowserNotifications(settings.reminders);
    return;
  }
  // fallback legacy single reminder
  if (!settings.enabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  const todayKey = `reminder_sent_${now.toDateString()}`;
  if (localStorage.getItem(todayKey)) return;
  const scheduledMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), settings.hour, settings.minute, 0).getTime();
  if (now.getTime() >= scheduledMs) {
    new Notification("חמישה חומשי תורה עם פירושים", {
      body: settings.message, icon: "/favicon.ico", dir: "rtl", lang: "he",
    });
    localStorage.setItem(todayKey, "1");
  }
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useNotifications() {
  const [settings, setSettings] = useState<ReminderSettings>(() => maybeAutoEnable());
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (Capacitor.isNativePlatform()) return "default";
    return "Notification" in window ? Notification.permission : "denied";
  });
  const [supported] = useState(() => Capacitor.isNativePlatform() || "Notification" in window);
  const [popupReminder, setPopupReminder] = useState<SingleReminder | null>(null);

  // Register popup callback
  useEffect(() => {
    onReminderPopup((r) => setPopupReminder(r));
    return () => { _popupCallback = null; };
  }, []);

  // Check native permission on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.checkPermissions().then((r) => {
        setPermission(r.display === "granted" ? "granted" : "default");
      });
    }
  }, []);

  // Browser polling
  useEffect(() => {
    maybeSendDailyNotification(settings);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        maybeSendDailyNotification(settings);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(() => {
      maybeSendDailyNotification(settings);
    }, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [settings]);

  // Schedule native when settings change
  useEffect(() => {
    scheduleNativeNotifications(settings.reminders);
  }, [settings.reminders]);

  const updateSettings = useCallback((partial: Partial<ReminderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveReminderSettings(next);
      return next;
    });
  }, []);

  const addReminder = useCallback((overrides?: Partial<SingleReminder>) => {
    setSettings((prev) => {
      const r = createDefaultReminder(overrides);
      const next = { ...prev, reminders: [...prev.reminders, r] };
      saveReminderSettings(next);
      return next;
    });
  }, []);

  const updateReminder = useCallback((id: string, partial: Partial<SingleReminder>) => {
    setSettings((prev) => {
      const reminders = prev.reminders.map((r) => (r.id === id ? { ...r, ...partial } : r));
      const next = { ...prev, reminders };
      saveReminderSettings(next);
      return next;
    });
  }, []);

  const removeReminder = useCallback((id: string) => {
    setSettings((prev) => {
      const reminders = prev.reminders.filter((r) => r.id !== id);
      const next = { ...prev, reminders };
      saveReminderSettings(next);
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const sendTestNotification = useCallback(() => {
    if (!supported || permission !== "granted") return;
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({
        notifications: [{
          id: 9999,
          title: "חמישה חומשי תורה עם פירושים - בדיקה",
          body: settings.reminders[0]?.message || settings.message,
          smallIcon: "ic_launcher",
        }],
      });
    } else {
      new Notification("חמישה חומשי תורה עם פירושים - בדיקה", {
        body: settings.reminders[0]?.message || settings.message,
        icon: "/favicon.ico",
        dir: "rtl",
        lang: "he",
      });
    }
  }, [supported, permission, settings]);

  const dismissPopup = useCallback(() => setPopupReminder(null), []);

  return {
    settings,
    updateSettings,
    addReminder,
    updateReminder,
    removeReminder,
    permission,
    requestPermission,
    sendTestNotification,
    supported,
    popupReminder,
    dismissPopup,
  };
}
