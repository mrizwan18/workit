"use client";

import { useEffect } from "react";
import { scheduleTodayNotifications, subscribeToPush, runSubscribeAfterReloadIfScheduled } from "@/lib/notifications";

export function NotificationSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => reg.update()).catch(() => {});
    }
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      scheduleTodayNotifications();
      runSubscribeAfterReloadIfScheduled().then((retryRan) => {
        if (!retryRan) subscribeToPush();
      });
    }
  }, []);

  return null;
}
