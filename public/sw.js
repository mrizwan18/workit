// Service worker for Before Work PWA
// Handles install, fetch (offline), and scheduled notification logic.
// Actual timing (10:40, 11:45, 12:15) would use push or periodic background sync where supported.

const CACHE_NAME = "before-work-v1";
const ASSETS = ["/", "/checklist", "/history", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
  );
});

// Notification when pushed from client (e.g. timer in app sends to SW)
// Sanitize: only accept string title/body, truncate length to prevent abuse
const MAX_TITLE = 100;
const MAX_BODY = 200;
function sanitize(str, maxLen) {
  if (typeof str !== "string") return "";
  return String(str).slice(0, maxLen);
}
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION" && event.data?.title) {
    const title = sanitize(String(event.data.title), MAX_TITLE) || "Before Work";
    const body = sanitize(String(event.data.body || ""), MAX_BODY);
    const icon = typeof event.data.icon === "string" && event.data.icon.startsWith("/") ? event.data.icon : "/icon-192.png";
    event.waitUntil(
      self.registration.showNotification(title, { body, icon })
    );
  }
});

// Background push from server: show notification when app is closed
self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === "granted")) return;
  let title = "Before Work";
  let body = "Workout reminder.";
  if (event.data) {
    try {
      const data = event.data.json();
      if (data && typeof data.title === "string") title = sanitize(data.title, MAX_TITLE);
      if (data && typeof data.body === "string") body = sanitize(data.body, MAX_BODY);
    } catch (_) {}
  }
  const opts = {
    body,
    icon: "/icon-192.png",
    tag: "before-work-reminder",
    requireInteraction: true,
    renotify: true,
  };
  event.waitUntil(
    self.registration.showNotification(title, opts).catch(() => {})
  );
});

// Clicking the notification opens/focuses the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const url = self.registration.scope;
      for (const client of clientList) {
        if (client.url.startsWith(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
