/**
 * Notification copy (no guilt, no motivation quotes — just facts).
 * Schedule is enforced by service worker / background logic.
 */

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

/** Schedule today's reminder notifications (10:40, 11:45, 12:15). Call after permission is granted. */
export function scheduleTodayNotifications(): void {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const at = (h: number, m: number) => new Date(year, month, date, h, m, 0);
  const schedule = [
    { time: at(10, 40), ...NOTIFICATION_COPY.morning },
    { time: at(11, 45), ...NOTIFICATION_COPY.afterWindow },
    { time: at(12, 15), ...NOTIFICATION_COPY.streakRisk },
  ] as const;
  for (const { time, title, body } of schedule) {
    if (time.getTime() <= now.getTime()) continue;
    const delay = time.getTime() - now.getTime();
    setTimeout(() => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon-192.png" });
      }
    }, delay);
  }
}
