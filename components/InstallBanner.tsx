"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "before-work-install-dismissed";

export function InstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const dismissedAt = typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) : null;
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      if (age < 7 * 24 * 60 * 60 * 1000) setDismissed(true);
      else setDismissed(false);
    } else {
      setDismissed(false);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setInstallEvent(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", () => {});
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (installed || dismissed || !installEvent) return null;

  return (
    <div className="border-b border-slate-700/50 bg-slate-800/60 px-4 py-3">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Install Before Work</p>
          <p className="text-xs text-slate-400">Add to home screen and open like an app</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition hover:bg-green-400"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-700/50"
            aria-label="Dismiss"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
