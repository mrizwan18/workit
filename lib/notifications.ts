/**
 * Notification copy (no guilt, no motivation quotes — just facts).
 * Schedule uses getNotificationTimes() so users can customize.
 */

const STORAGE_KEY = "before-work-notification-times";

export const DEFAULT_NOTIFICATION_TIMES = {
  morning: "10:40",
  beforeWork: "11:45",
  streakRisk: "12:15",
} as const;

export type NotificationTimesKey = keyof typeof DEFAULT_NOTIFICATION_TIMES;

export type NotificationTimes = Record<NotificationTimesKey, string>;

export const NOTIFICATION_COPY = {
  morning: {
    title: "Before Work",
    body: "Workout = commute. Start now.",
  },
  afterWindow: {
    title: "Before Work",
    body: "Log your workout before work starts.",
  },
  streakRisk: {
    title: "Before Work",
    body: "Streak at risk. 10 minutes still counts.",
  },
} as const;

const SCHEDULE_KEYS: NotificationTimesKey[] = ["morning", "beforeWork", "streakRisk"];

function parseTimeHHMM(value: string): { h: number; m: number } | null {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

export function getNotificationTimes(): NotificationTimes {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_TIMES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_TIMES };
    const parsed = JSON.parse(raw) as Partial<Record<NotificationTimesKey, string>>;
    const out: NotificationTimes = { ...DEFAULT_NOTIFICATION_TIMES };
    for (const key of SCHEDULE_KEYS) {
      const val = parsed[key];
      if (typeof val === "string" && parseTimeHHMM(val)) out[key] = val;
    }
    return out;
  } catch {
    return { ...DEFAULT_NOTIFICATION_TIMES };
  }
}

export function setNotificationTimes(times: Partial<NotificationTimes>): void {
  if (typeof window === "undefined") return;
  const current = getNotificationTimes();
  const next = { ...current };
  for (const key of SCHEDULE_KEYS) {
    if (typeof times[key] === "string" && parseTimeHHMM(times[key] as string))
      next[key] = times[key] as string;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showNotification(title: string, body: string, icon = "/icon-192.png"): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon });
  } catch {
    // ignore
  }
}

/** Show a notification immediately so the user can verify notifications work. */
export function sendTestNotification(): void {
  showNotification("Before Work", "Test notification. If you see this, reminders are working.");
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Subscribe to Web Push and register with the backend for background reminders. */
export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;
    const vapidRes = await fetch("/api/push-vapid");
    if (!vapidRes.ok) return false;
    const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
    if (!publicKey) return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
    const times = getNotificationTimes();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    const res = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), times, timezone }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Schedule today's reminder notifications using saved times. Call after permission is granted. */
export function scheduleTodayNotifications(): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const times = getNotificationTimes();
  const schedule = [
    { ...NOTIFICATION_COPY.morning, timeStr: times.morning },
    { ...NOTIFICATION_COPY.afterWindow, timeStr: times.beforeWork },
    { ...NOTIFICATION_COPY.streakRisk, timeStr: times.streakRisk },
  ];
  for (const { timeStr, title, body } of schedule) {
    const parsed = parseTimeHHMM(timeStr);
    if (!parsed) continue;
    const time = new Date(year, month, date, parsed.h, parsed.m, 0);
    if (time.getTime() <= now.getTime()) continue;
    const delay = time.getTime() - now.getTime();
    setTimeout(() => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon-192.png" });
      }
    }, delay);
  }
}
