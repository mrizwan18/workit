"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getTodayKey,
  getCurrentStreak,
  isCompleted,
  logWorkoutCompleted,
  canLogDate,
  alreadyLogged,
  isStreakAtRisk,
  isRestDay,
  isPermanentDanger,
  recordReset,
  getTrackingStartedDate,
  setTrackingStarted,
} from "@/lib/storage";
import { getQuoteOfTheDay } from "@/lib/quotes";
import { requestNotificationPermission, getNotificationPermission, scheduleTodayNotifications } from "@/lib/notifications";
import { WorkoutMusicWidget } from "@/components/WorkoutMusicWidget";
import { AshamedModal } from "@/components/AshamedModal";

/** 11:45 = "approaching end" - danger zone if workout not logged (weekday only). */
const DANGER_HOUR = 11;
const DANGER_MINUTE = 45;

function isApproachingEnd(): boolean {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const cutoff = DANGER_HOUR * 60 + DANGER_MINUTE;
  return minutes >= cutoff;
}

type StatusVariant = "green" | "grey" | "red";

function getWorkoutStatusVariant(
  logged: boolean,
  today: string,
  atRisk: boolean,
  permanentDanger: boolean
): StatusVariant {
  if (logged) return "green";
  if (isRestDay(today)) return "grey";
  if (permanentDanger) return "red";
  if (atRisk) return "red";
  if (isApproachingEnd()) return "red";
  return "grey";
}

export default function HomePage() {
  const today = getTodayKey();
  const [trackingStarted, setTrackingStartedState] = useState<boolean | null>(null);
  const [logged, setLogged] = useState(false);
  const [streak, setStreak] = useState(0);
  const [atRisk, setAtRisk] = useState(false);
  const [permanentDanger, setPermanentDanger] = useState(false);
  const [ashamedOpen, setAshamedOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  const refresh = useCallback(() => {
    setTrackingStartedState(!!getTrackingStartedDate());
    setLogged(isCompleted(today));
    setStreak(getCurrentStreak());
    setAtRisk(isStreakAtRisk());
    setPermanentDanger(isPermanentDanger());
  }, [today]);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!mounted) return;
    setNotificationPermission(getNotificationPermission());
  }, [mounted]);

  const handleStartImprovement = () => {
    setTrackingStarted(today);
    refresh();
  };

  const handleLog = () => {
    if (!canLogDate(today) || alreadyLogged(today)) return;
    logWorkoutCompleted(today);
    refresh();
  };

  const handleAshamedConfirm = () => {
    recordReset();
    refresh();
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === "granted") scheduleTodayNotifications();
  };

  const displayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const quote = getQuoteOfTheDay(today);
  const statusVariant = getWorkoutStatusVariant(logged, today, atRisk, permanentDanger);
  const isDanger = statusVariant === "red";
  const approachingEnd = !logged && !isRestDay(today) && isApproachingEnd() && !permanentDanger && !atRisk;

  if (!mounted) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-4">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (trackingStarted === false) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-12 text-center">
        <p className="font-display text-3xl uppercase leading-tight tracking-wide text-white md:text-4xl">
          {quote}
        </p>
        <p className="mt-6 text-slate-400">{displayDate}</p>
        <p className="mt-4 text-sm text-slate-500">
          One step at a time. Start your streak today.
        </p>
        <button
          type="button"
          onClick={handleStartImprovement}
          className="mt-10 w-full max-w-xs rounded-2xl bg-accent py-4 font-semibold text-surface shadow-lg shadow-accent/20 transition hover:bg-green-400 hover:shadow-accent/30 active:scale-[0.98]"
        >
          Start Improvement
        </button>
        <p className="mt-6 text-xs text-slate-500">
          You’ll be able to log workouts, track your streak, and see your history.
        </p>
      </div>
    );
  }

  const statusStyles = {
    green: "border-accent/50 bg-accent/10",
    grey: "border-slate-700/40 bg-slate-800/40",
    red: "border-red-500/50 bg-red-500/10",
  };

  return (
    <>
      <div
        className={`min-h-dvh transition-colors ${
          isDanger ? "bg-red-950/20" : ""
        }`}
      >
        <div className="mx-auto max-w-md px-4 pt-6 pb-8">
          <p className="font-display text-2xl uppercase leading-tight tracking-wide text-white/95 md:text-3xl" aria-label="Daily motivation">
            {quote}
          </p>
          <p className="mt-2 text-sm text-slate-400">{displayDate}</p>

          <WorkoutMusicWidget dateKey={today} />

          <section
            className={`mt-8 rounded-2xl border p-6 shadow-lg ${statusStyles[statusVariant]} ${
              approachingEnd ? "animate-pulse" : ""
            }`}
          >
            <p className="text-sm font-medium text-slate-400">Workout status</p>
            {logged ? (
              <p className="mt-2 flex items-center gap-2 text-accent">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                <span className="font-semibold">Completed</span>
              </p>
            ) : isRestDay(today) ? (
              <p className="mt-2 flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 shrink-0 rounded-full bg-slate-500" aria-hidden />
                <span>Rest day</span>
              </p>
            ) : (
              <p className={`mt-2 flex items-center gap-2 ${isDanger ? "text-red-300" : "text-slate-400"}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${isDanger ? "bg-red-400" : "border-2 border-slate-500"}`} aria-hidden />
                <span>Not logged</span>
              </p>
            )}

            {!logged && !isRestDay(today) && (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleLog}
                  className="w-full rounded-xl bg-accent py-3.5 font-semibold text-surface shadow-md shadow-accent/20 transition hover:bg-green-400 hover:shadow-accent/30 active:scale-[0.98]"
                >
                  Log Workout
                </button>
                <p className="text-center text-sm text-slate-500">
                  Or use the <Link href="/checklist" className="text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent">Checklist</Link> (min 2 items = workout)
                </p>
              </div>
            )}
          </section>

          <section className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-800/30 py-4">
            <span className="text-xl font-bold text-white">{streak}</span>
            <span className="text-slate-400">day streak</span>
          </section>

          <section className="mt-6 rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3">
            <p className="text-sm font-medium text-slate-400">Reminders</p>
            {notificationPermission === "granted" ? (
              <p className="mt-1 text-sm text-accent">Notifications enabled (10:40, 11:45, 12:15)</p>
            ) : notificationPermission === "denied" ? (
              <p className="mt-1 text-sm text-slate-400">
                Notifications are blocked. Enable them in your browser settings (e.g. lock icon in the address bar) to get workout reminders.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-400">Get workout reminders at 10:40, 11:45, 12:15</p>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="mt-3 w-full rounded-lg border border-slate-600 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
                >
                  Enable notifications
                </button>
              </>
            )}
          </section>

          {atRisk && !logged && !isRestDay(today) && !permanentDanger && (
            <div className="mt-6 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200">
              <p className="font-medium">Streak at risk</p>
              <p className="mt-1 text-sm text-amber-200/90">Log today to keep your streak. 10 minutes still counts.</p>
            </div>
          )}

          {permanentDanger && (
            <div className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-200">
              <p className="font-medium">Two weekdays missed in a row</p>
              <p className="mt-1 text-sm text-red-200/90">The only way to reset is to own it.</p>
              <button
                type="button"
                onClick={() => setAshamedOpen(true)}
                className="mt-3 w-full rounded-lg border border-red-400/50 bg-red-600/30 py-2.5 text-sm font-medium text-red-100 transition hover:bg-red-600/50"
              >
                I am ashamed
              </button>
            </div>
          )}
        </div>
      </div>

      <AshamedModal
        open={ashamedOpen}
        onClose={() => setAshamedOpen(false)}
        onConfirm={handleAshamedConfirm}
      />
    </>
  );
}
