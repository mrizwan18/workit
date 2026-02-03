"use client";

import { useEffect } from "react";
import {
  scheduleTodayNotifications,
  subscribeToPush,
  runSubscribeAfterReloadIfScheduled,
} from "@/lib/notifications";

async function registerAndStabilizeSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  // Register with explicit root scope (important for push + control)
  const reg = await navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch(() => null);

  if (!reg) return;

  // Wait until the SW is ready (active)
  await navigator.serviceWorker.ready;

  // If the page is not yet controlled, reload ONCE so it becomes controlled.
  // Android Chrome often needs this before push subscribe succeeds.
  if (!navigator.serviceWorker.controller) {
    const key = "before-work-sw-reload-once";
    const alreadyReloaded = sessionStorage.getItem(key) === "1";
    if (!alreadyReloaded) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
      return;
    }
  } else {
    sessionStorage.removeItem("before-work-sw-reload-once");
  }

  // Optional: don't force update here; it can keep SW in a changing state.
  // If you still want updates, do it later (e.g., after initial setup).
}

export function NotificationSetup() {
  useEffect(() => {
    const run = async () => {
      // 1) Ensure SW is registered AND controlling the page
      await registerAndStabilizeSW();

      // 2) If permission already granted, schedule in-page reminders
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        scheduleTodayNotifications();

        // 3) If user triggered a "reload-and-retry", run subscribe once
        const retryRan = await runSubscribeAfterReloadIfScheduled();
        if (!retryRan) {
          // Delay slightly to let SW settle
          await new Promise((r) => setTimeout(r, 300));
          await subscribeToPush();
        }
      }
    };

    run();
  }, []);

  return null;
}