"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import {
  requestNotificationPermission,
  getNotificationPermission,
  scheduleTodayNotifications,
  getNotificationTimes,
  setNotificationTimes,
  type NotificationTimes,
} from "@/lib/notifications";
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
  const pathname = usePathname();
  const today = getTodayKey();
  const [trackingStarted, setTrackingStartedState] = useState<boolean | null>(null);
  const [logged, setLogged] = useState(false);
  const [streak, setStreak] = useState(0);
  const [atRisk, setAtRisk] = useState(false);
  const [permanentDanger, setPermanentDanger] = useState(false);
  const [ashamedOpen, setAshamedOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [reminderTimes, setReminderTimes] = useState<NotificationTimes | null>(null);
  const [showCustomizeTimes, setShowCustomizeTimes] = useState(false);
  const [customTimes, setCustomTimes] = useState<NotificationTimes>({ morning: "10:40", beforeWork: "11:45", streakRisk: "12:15" });

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
    if (pathname === "/") refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!mounted) return;
    setNotificationPermission(getNotificationPermission());
    setReminderTimes(getNotificationTimes());
    setCustomTimes(getNotificationTimes());
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

  const handleSaveReminderTimes = () => {
    setNotificationTimes(customTimes);
    setReminderTimes(getNotificationTimes());
    setShowCustomizeTimes(false);
    if (notificationPermission === "granted") scheduleTodayNotifications();
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
    green: "border-accent/60 bg-accent/15",
    grey: "border-slate-600/50 bg-slate-800/50",
    red: "border-red-500/60 bg-red-500/15",
  };

  const statusLabel = logged ? "Completed" : isRestDay(today) ? "Rest day" : "Not logged";

  return (
    <>
      <div
        className={`min-h-dvh transition-colors ${
          isDanger ? "bg-red-950/20" : ""
        }`}
      >
        <div className="mx-auto max-w-md px-4 pt-6 pb-8">
          <p className="text-center text-sm text-slate-500">{displayDate}</p>

          {/* Hero: workout status — eyes land here first */}
          <section
            className={`mt-4 rounded-3xl border-2 px-6 py-8 shadow-xl ${statusStyles[statusVariant]} ${
              statusVariant === "green" ? "shadow-lg" : ""
            } ${statusVariant === "red" ? "shadow-lg" : ""} ${
              approachingEnd ? "animate-pulse" : ""
            }`}
            aria-label={`Workout status: ${statusLabel}`}
          >
            <div className="flex flex-col items-center text-center">
              {logged ? (
                <>
                  <p className="text-2xl font-bold uppercase tracking-wide text-accent md:text-3xl">
                    Completed
                  </p>
                  <p className="mt-1 text-sm text-accent/80">You moved today.</p>
                </>
              ) : isRestDay(today) ? (
                <>
                  <p className="text-2xl font-bold uppercase tracking-wide text-slate-400 md:text-3xl">
                    Rest day
                  </p>
                  <p className="mt-1 text-sm text-slate-500">No workout required.</p>
                </>
              ) : (
                <>
                  <p
                    className={`text-2xl font-bold uppercase tracking-wide md:text-3xl ${
                      isDanger ? "text-red-200" : "text-slate-300"
                    }`}
                  >
                    Not logged
                  </p>
                  <p className={`mt-1 text-sm ${isDanger ? "text-red-300/90" : "text-slate-500"}`}>
                    {isDanger ? "Log now to stay on track." : "Tap below when you’re done."}
                  </p>
                </>
              )}
            </div>

            {!logged && !isRestDay(today) && (
              <div className="mt-6 flex flex-col gap-3">
                {permanentDanger ? (
                  <>
                    <p className="text-center text-sm text-red-200/90">Two weekdays missed in a row. The only way to reset is to own it.</p>
                    <button
                      type="button"
                      onClick={() => setAshamedOpen(true)}
                      className="w-full rounded-2xl border-2 border-red-400/60 bg-red-600/40 py-4 text-lg font-semibold text-red-100 shadow-lg transition hover:bg-red-600/60 active:scale-[0.98]"
                    >
                      I am ashamed
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleLog}
                      className="w-full rounded-2xl bg-accent py-4 text-lg font-semibold text-surface shadow-lg shadow-accent/25 transition hover:bg-green-400 hover:shadow-accent/35 active:scale-[0.98]"
                    >
                      Log Workout
                    </button>
                    <p className="text-center text-sm text-slate-500">
                      Or use the <Link href="/checklist" className="text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent">Checklist</Link> (min 2 items = workout)
                    </p>
                  </>
                )}
              </div>
            )}
          </section>

          <div className="mt-6 flex items-start justify-center gap-1 text-center" aria-label="Daily motivation">
            <span className="font-serif text-4xl leading-none text-white/50 md:text-5xl" aria-hidden>"</span>
            <p className="flex-1 font-display text-lg uppercase leading-tight tracking-wide text-white/70 md:text-xl">
              {quote}
            </p>
            <span className="font-serif text-4xl leading-none text-white/50 md:text-5xl" aria-hidden>"</span>
          </div>

          <WorkoutMusicWidget dateKey={today} />

          <section className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-800/30 py-4">
            <span className="text-xl font-bold text-white">{streak}</span>
            <span className="text-slate-400">day streak</span>
          </section>

          <section className="mt-6 rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3">
            <p className="text-sm font-medium text-slate-400">Reminders</p>
            {notificationPermission === "granted" ? (
              <>
                <p className="mt-1 text-sm text-accent">
                  Notifications enabled
                  {reminderTimes && ` (${reminderTimes.morning}, ${reminderTimes.beforeWork}, ${reminderTimes.streakRisk})`}
                </p>
                {!showCustomizeTimes ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomizeTimes(true)}
                    className="mt-2 text-xs text-slate-400 underline hover:text-slate-300"
                  >
                    Customize times
                  </button>
                ) : (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-600/50 bg-slate-800/50 p-3">
                    <p className="text-xs text-slate-400">Set your reminder times (not everyone has the same routine)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500">Start</label>
                        <input
                          type="time"
                          value={customTimes.morning}
                          onChange={(e) => setCustomTimes((t) => ({ ...t, morning: e.target.value }))}
                          className="mt-0.5 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500">Before work</label>
                        <input
                          type="time"
                          value={customTimes.beforeWork}
                          onChange={(e) => setCustomTimes((t) => ({ ...t, beforeWork: e.target.value }))}
                          className="mt-0.5 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500">Last chance</label>
                        <input
                          type="time"
                          value={customTimes.streakRisk}
                          onChange={(e) => setCustomTimes((t) => ({ ...t, streakRisk: e.target.value }))}
                          className="mt-0.5 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveReminderTimes}
                        className="rounded border border-accent/50 bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCustomizeTimes(false); setCustomTimes(getNotificationTimes()); }}
                        className="text-xs text-slate-400 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : notificationPermission === "denied" ? (
              <p className="mt-1 text-sm text-slate-400">
                Notifications are blocked. Enable them in your browser settings (e.g. lock icon in the address bar) to get workout reminders.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-400">
                  Get workout reminders at your chosen times (customize after enabling).
                </p>
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

          {process.env.NODE_ENV === "development" && (
            <p className="mt-8 text-center">
              <Link href="/simulate" className="text-xs text-slate-500 underline hover:text-slate-400">
                Simulate UI states
              </Link>
            </p>
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
