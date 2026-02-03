// Service worker for Before Work PWA
// Handles install, fetch (offline), push (background notifications), and message (in-page reminders).

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

const MAX_TITLE = 100;
const MAX_BODY = 200;
function sanitize(str, maxLen) {
  if (typeof str !== "string") return "";
  return String(str).slice(0, maxLen);
}

// In-page reminder: client posts SHOW_NOTIFICATION to SW
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION" && event.data?.title) {
    const title = sanitize(String(event.data.title), MAX_TITLE) || "Before Work";
    const body = sanitize(String(event.data.body || ""), MAX_BODY);
    const icon = typeof event.data.icon === "string" && event.data.icon.startsWith("/") ? event.data.icon : "/icon-192.png";
    event.waitUntil(
      self.registration.showNotification(title, { body, icon, tag: "before-work-reminder", renotify: true })
    );
  }
});

// Background push from cron: payload { title, body, url }
self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === "granted")) return;
  let title = "Before Work";
  let body = "Workout reminder.";
  let url = "/";
  if (event.data) {
    try {
      const data = event.data.json();
      if (data && typeof data.title === "string") title = sanitize(data.title, MAX_TITLE);
      if (data && typeof data.body === "string") body = sanitize(data.body, MAX_BODY);
      if (data && typeof data.url === "string" && data.url.startsWith("/")) url = data.url;
    } catch (_) {}
  }
  const opts = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "before-work-reminder",
    requireInteraction: true,
    renotify: true,
    data: { url },
  };
  event.waitUntil(
    self.registration.showNotification(title, opts).catch(() => {})
  );
});

// Clicking the notification opens url (or focus existing client)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const dataUrl = (event.notification.data && event.notification.data.url) || "/";
  const fullUrl = dataUrl.startsWith("http") ? dataUrl : new URL(dataUrl, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});
