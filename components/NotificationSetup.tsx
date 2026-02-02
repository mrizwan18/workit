"use client";

import { useEffect } from "react";
import { NOTIFICATION_COPY, requestNotificationPermission } from "@/lib/notifications";

function scheduleTodayNotifications() {
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

export function NotificationSetup() {
  useEffect(() => {
    requestNotificationPermission().then((perm) => {
      if (perm !== "granted") return;
      scheduleTodayNotifications();
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg.update())
        .catch(() => {});
    }
  }, []);

  return null;
}
