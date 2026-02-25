import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dailyLearningReminder";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
  message: string;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 7,
  minute: 0,
  message: "זמן ללמוד תורה! 📖",
};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Request browser notification permission. Returns the new permission state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/** Check if it's time to send the daily notification and send it if needed. */
function maybeSendDailyNotification(settings: ReminderSettings) {
  if (!settings.enabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const todayKey = `reminder_sent_${now.toDateString()}`;
  if (localStorage.getItem(todayKey)) return;   // already sent today

  const scheduledMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), settings.hour, settings.minute, 0).getTime();

  if (now.getTime() >= scheduledMs) {
    new Notification("חמישה חומשי תורה", {
      body: settings.message,
      icon: "/favicon.ico",
      dir: "rtl",
      lang: "he",
    });
    localStorage.setItem(todayKey, "1");
  }
}

export function useNotifications() {
  const [settings, setSettings] = useState<ReminderSettings>(loadReminderSettings);
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [supported] = useState(() => "Notification" in window);

  // On mount and on visibility-change, check if reminder should fire
  useEffect(() => {
    maybeSendDailyNotification(settings);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        maybeSendDailyNotification(settings);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Interval check every 60 s while app is open
    const interval = setInterval(() => {
      maybeSendDailyNotification(settings);
    }, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<ReminderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
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
    new Notification("חמישה חומשי תורה - בדיקה", {
      body: settings.message,
      icon: "/favicon.ico",
      dir: "rtl",
      lang: "he",
    });
  }, [supported, permission, settings.message]);

  return {
    settings,
    updateSettings,
    permission,
    requestPermission,
    sendTestNotification,
    supported,
  };
}
