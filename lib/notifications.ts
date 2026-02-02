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
