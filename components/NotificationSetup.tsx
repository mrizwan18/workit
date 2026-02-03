"use client";

import { useEffect } from "react";
import { scheduleTodayNotifications, subscribeToPush, runSubscribeAfterReloadIfScheduled } from "@/lib/notifications";

export function NotificationSetup() {
  useEffect(() => {
    const run = async () => {
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/sw.js").then((reg) => reg.update()).catch(() => {});
      }
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        scheduleTodayNotifications();
        const retryRan = await runSubscribeAfterReloadIfScheduled();
        if (!retryRan) {
          await new Promise((r) => setTimeout(r, 500));
          await subscribeToPush();
        }
      }
    };
    run();
  }, []);

  return null;
}
