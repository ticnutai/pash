import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { getOmerBoardData } from "@/utils/omerUtils";
import { getCalendarPreference } from "@/utils/parshaUtils";

/* ─── Types ──────────────────────────────────────────────── */

const STORAGE_KEY = "omer_reminders_v1";
const CHANNEL_ID = "omer_reminders";

/** Ensure notification channel exists on Android (required API 26+) */
async function ensureNotificationChannel() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const channels = await LocalNotifications.listChannels();
    const exists = channels.channels.some((c) => c.id === CHANNEL_ID);
    if (!exists) {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "תזכורות ספירת העומר",
        description: "תזכורות יומיות לספירת העומר",
        importance: 5, // MAX — heads-up notifications
        visibility: 1, // PUBLIC
        sound: "default",
        vibration: true,
        lights: true,
      });
    }
  } catch (e) { console.warn("Failed to create notification channel:", e); }
}
// Run on module load
ensureNotificationChannel();

export type OmerChannel = "push" | "popup" | "whatsapp" | "email";

export type OmerVoiceSound = "none" | "chime" | "shofar" | "bell" | "tts-blessing" | "tts-count";

export const VOICE_SOUND_OPTIONS: { value: OmerVoiceSound; label: string; icon: string }[] = [
  { value: "none", label: "ללא צליל", icon: "🔇" },
  { value: "chime", label: "צלצול", icon: "🔔" },
  { value: "shofar", label: "שופר", icon: "📯" },
  { value: "bell", label: "פעמון", icon: "🔕" },
  { value: "tts-blessing", label: "הקראת ברכה", icon: "🗣️" },
  { value: "tts-count", label: "הקראת ספירה", icon: "🗣️" },
];

export interface OmerReminder {
  id: string;
  enabled: boolean;
  hour: number;
  minute: number;
  message: string;
  label: string;
  channels: OmerChannel[];
  /** Days of week enabled (0=Sun … 6=Sat). Undefined → all days. */
  days?: number[];
  /** Voice/sound to play when delivering. Undefined → none. */
  voiceSound?: OmerVoiceSound;
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
    days: [0, 1, 2, 3, 4, 5, 6],
    voiceSound: "none",
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

/* ─── Voice / Sound playback ─────────────────────────────── */

/** Shared AudioContext — reused to avoid Android WebView limits */
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      _audioCtx = new AC();
    }
    // Resume if suspended (Android requires user gesture)
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
    return _audioCtx;
  } catch { return null; }
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

function playChime() {
  playTone(880, 0.3);
  setTimeout(() => playTone(1100, 0.3), 300);
  setTimeout(() => playTone(1320, 0.5), 600);
}

function playShofarSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.4);
    osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch { /* audio not available */ }
}

function playBellSound() {
  playTone(660, 0.8, "triangle");
  setTimeout(() => playTone(660, 0.6, "triangle"), 900);
}

function speakText(text: string) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "he-IL";
    utter.rate = 0.85;
    utter.pitch = 1.0;

    // Voices may load async — try now, retry once if empty
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const heVoice = voices.find((v) => v.lang.startsWith("he"));
      if (heVoice) utter.voice = heVoice;
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak();
    } else {
      // Voices not loaded yet — wait for them
      window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null; };
      // Fallback timeout — if voices never load (WebView), play chime instead
      setTimeout(() => {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
        playChime(); // fallback sound
      }, 500);
    }
  } else {
    // SpeechSynthesis not available — play musical fallback
    playChime();
  }
}

export function playVoiceSound(sound: OmerVoiceSound, omerText?: { blessing: string; countText: string }) {
  switch (sound) {
    case "chime": playChime(); break;
    case "shofar": playShofarSound(); break;
    case "bell": playBellSound(); break;
    case "tts-blessing":
      speakText(omerText?.blessing ?? "בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל סְפִירַת הָעוֹמֶר.");
      break;
    case "tts-count":
      if (omerText?.countText) speakText(omerText.countText);
      else speakText("היום יום אחד לעומר");
      break;
    case "none":
    default:
      break;
  }
}

/* ─── Delivery ───────────────────────────────────────────── */

function deliverReminder(reminder: OmerReminder) {
  const fullMessage = buildOmerMessage(reminder);
  const omer = getTodayOmerText();
  const title = omer ? `🕯️ ${omer.dayLine}` : "🕯️ ספירת העומר";

  // Voice / sound alert
  if (reminder.voiceSound && reminder.voiceSound !== "none") {
    playVoiceSound(reminder.voiceSound, omer ? { blessing: omer.blessing, countText: omer.countText } : undefined);
  }

  // Push notification
  if (reminder.channels.includes("push")) {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title,
          body: fullMessage,
          channelId: CHANNEL_ID,
          sound: "default",
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
        channelId: CHANNEL_ID,
        sound: "default",
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
    // Skip if today's day-of-week is not in the enabled days list
    if (r.days && !r.days.includes(now.getDay())) continue;
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

  const toggleReminderDay = useCallback((id: string, day: number) => {
    setReminders((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const days = r.days ?? [0, 1, 2, 3, 4, 5, 6];
        const updated = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
        return { ...r, days: updated };
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
    // Use first reminder's voiceSound for the test, or "chime" as default
    const firstSound = reminders.length > 0 ? (reminders[0].voiceSound ?? "none") : "none";
    const testReminder: OmerReminder = {
      id: "test",
      enabled: true,
      hour: 0,
      minute: 0,
      message: "🕯️ זו התראת בדיקה לספירת העומר!",
      label: "בדיקה",
      channels: ["push", "popup"],
      voiceSound: firstSound,
    };
    deliverReminder(testReminder);
  }, [supported, reminders]);

  const dismissPopup = useCallback(() => setPopupReminder(null), []);

  return {
    reminders,
    addReminder,
    updateReminder,
    removeReminder,
    toggleChannel,
    toggleReminderDay,
    permission,
    askPermission,
    sendTest,
    supported,
    popupReminder,
    dismissPopup,
  };
}
