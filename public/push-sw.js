/// <reference lib="webworker" />
/* ─── Push Notification Service Worker ──────────────────────
 * Runs in the background even when the browser tab is closed.
 * Receives push events from the server and shows notifications.
 * ────────────────────────────────────────────────────────── */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "חומשי תורה", body: event.data.text() };
  }

  const title = payload.title || "חמישה חומשי תורה";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192x192.png",
    badge: "/icon-192x192.png",
    dir: "rtl",
    lang: "he",
    tag: payload.tag || "torah-push",
    renotify: true,
    vibrate: [200, 100, 200, 100, 200], // vibration pattern for sound/haptic
    requireInteraction: true, // stay visible until user interacts
    data: {
      url: payload.url || "/",
      reminderId: payload.reminderId,
      type: payload.type, // "daily" | "omer"
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if found
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});

// Keep SW alive
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
