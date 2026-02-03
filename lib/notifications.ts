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

/** Ask the service worker to show a notification (OS-level; works when tab is in background). */
function showNotificationViaSW(title: string, body: string, icon = "/icon-192.png"): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) {
    try {
      new Notification(title, { body, icon });
    } catch {
      // ignore
    }
    return;
  }
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.active) reg.active.postMessage({ type: "SHOW_NOTIFICATION", title, body, icon });
    else try { new Notification(title, { body, icon }); } catch { /* ignore */ }
  }).catch(() => {
    try { new Notification(title, { body, icon }); } catch { /* ignore */ }
  });
}

export function showNotification(title: string, body: string, icon = "/icon-192.png"): void {
  showNotificationViaSW(title, body, icon);
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

/** Validate VAPID public key: base64url decode and expect 65 bytes (uncompressed P-256). */
function validateVapidPublicKey(publicKey: string): { ok: true; key: Uint8Array } | { ok: false; error: string } {
  const trimmed = publicKey.trim();
  if (!trimmed) return { ok: false, error: "Push key is missing. Please try again later." };
  try {
    const key = urlBase64ToUint8Array(trimmed);
    if (key.length !== 65) {
      return { ok: false, error: "Push key is invalid. Please refresh and try again." };
    }
    return { ok: true, key };
  } catch {
    return { ok: false, error: "Push key is invalid. Please refresh and try again." };
  }
}

export type SubscribeToPushResult = { ok: true } | { ok: false; error: string };

const RETRY_PUSH_AFTER_RELOAD_KEY = "before-work-retry-push-after-reload";
export const PUSH_SUBSCRIBE_FAILED_EVENT = "before-work-push-subscribe-failed";

function shouldRetryPushAfterReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(RETRY_PUSH_AFTER_RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

function clearRetryPushAfterReload(): void {
  try {
    sessionStorage.removeItem(RETRY_PUSH_AFTER_RELOAD_KEY);
  } catch {
    // ignore
  }
}

/** Set a flag and reload the page. After reload, subscribe will run once automatically (e.g. from NotificationSetup). */
export function scheduleReloadAndRetryPush(): void {
  try {
    sessionStorage.setItem(RETRY_PUSH_AFTER_RELOAD_KEY, "1");
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

const PUSH_ERROR_AFTER_RELOAD_KEY = "before-work-push-error-after-reload";

/** Call this on app load when permission is already granted. If retry flag is set, runs subscribe once and clears flag. Returns true if the retry ran. */
export async function runSubscribeAfterReloadIfScheduled(): Promise<boolean> {
  if (!shouldRetryPushAfterReload()) return false;
  clearRetryPushAfterReload();
  const result = await subscribeToPush();
  if (!result.ok && typeof window !== "undefined") {
    try {
      sessionStorage.setItem(PUSH_ERROR_AFTER_RELOAD_KEY, result.error);
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new CustomEvent(PUSH_SUBSCRIBE_FAILED_EVENT, { detail: { error: result.error } })
    );
  }
  return true;
}

/** Read and clear any push error that was stored after a reload-and-retry. Call from page when showing reminders section. */
export function consumePushErrorAfterReload(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const err = sessionStorage.getItem(PUSH_ERROR_AFTER_RELOAD_KEY);
    sessionStorage.removeItem(PUSH_ERROR_AFTER_RELOAD_KEY);
    return err;
  } catch {
    return null;
  }
}

/** Subscribe to Web Push and register with the backend for background reminders. */
export async function subscribeToPush(): Promise<SubscribeToPushResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Push not supported" };
  }
  if (Notification.permission !== "granted") {
    return { ok: false, error: "Permission not granted" };
  }
  const reg = await navigator.serviceWorker.ready;
  if (!reg.pushManager) {
    return { ok: false, error: "PushManager not available" };
  }
  const vapidRes = await fetch("/api/push-vapid");
  if (!vapidRes.ok) {
    return { ok: false, error: "Failed to get push config" };
  }
  const { publicKey: rawKey } = (await vapidRes.json()) as { publicKey?: string };
  if (!rawKey) {
    return { ok: false, error: "Invalid push config" };
  }
  const validated = validateVapidPublicKey(rawKey);
  if (!validated.ok) return { ok: false, error: validated.error };
  const applicationServerKey = validated.key as BufferSource;

  const doSubscribe = async (): Promise<PushSubscription> => {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  };

  let sub: PushSubscription;
  try {
    sub = await doSubscribe();
  } catch (e1) {
    const msg1 = e1 instanceof Error ? e1.message : String(e1);
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        sub = await doSubscribe();
      } catch (e2) {
        return {
          ok: false,
          error: `Subscribe failed: ${e2 instanceof Error ? e2.message : String(e2)}. Try adding the app to your home screen and opening it from there, or reload the page and try again.`,
        };
      }
    } else {
      return { ok: false, error: `Subscribe failed: ${msg1}` };
    }
  }

  try {
    const times = getNotificationTimes();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    const res = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), times, timezone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { error?: string }).error || `Server error ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to register: ${msg}` };
  }
}

/** Unsubscribe from push and remove from backend. */
export async function unsubscribeToPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch("/api/push-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    }
    return true;
  } catch {
    return false;
  }
}

/** Reset notifications: unsubscribe then resubscribe (fixes stuck or expired state). */
export async function resetNotifications(): Promise<SubscribeToPushResult> {
  await unsubscribeToPush();
  return subscribeToPush();
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
        showNotificationViaSW(title, body, "/icon-192.png");
      }
    }, delay);
  }
}
