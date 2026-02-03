"use client";

import Link from "next/link";
import {
  getTodayKey,
  setWorkouts,
  setTrackingStarted,
  clearTrackingStarted,
  setForgivenAt,
  clearForgivenAt,
  isRestDay,
  type WorkoutsData,
} from "@/lib/storage";

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

const scenarios: {
  id: string;
  name: string;
  description: string;
  apply: () => void;
}[] = [
  {
    id: "not-started",
    name: "Not started (onboarding)",
    description: "No tracking yet. Home shows quote + “Start Improvement” button only.",
    apply: () => {
      clearTrackingStarted();
      setWorkouts({});
      clearForgivenAt();
    },
  },
  {
    id: "nothing",
    name: "Nothing logged",
    description: "Tracking started today, no workouts. Home shows Not logged, streak 0.",
    apply: () => {
      setTrackingStarted(getTodayKey());
      setWorkouts({});
      clearForgivenAt();
    },
  },
  {
    id: "first-miss",
    name: "First day miss (streak at risk)",
    description: "Tracking started yesterday (weekday). Yesterday and today not logged. Home shows Not logged + “Streak at risk”.",
    apply: () => {
      const yesterday = daysAgo(1);
      setTrackingStarted(yesterday);
      setWorkouts({});
      clearForgivenAt();
    },
  },
  {
    id: "second-miss",
    name: "2nd day miss (permanent danger)",
    description: "Two consecutive weekdays missed. Home shows red card + “I am ashamed” button.",
    apply: () => {
      // Start far enough back so yesterday AND the previous weekday are in range (e.g. Tue: yesterday Mon, prev Fri).
      setTrackingStarted(daysAgo(6));
      setWorkouts({});
      clearForgivenAt();
    },
  },
  {
    id: "history",
    name: "Previous history logged",
    description: "Tracking started 14 days ago, weekdays completed until yesterday, today not. Home shows streak, Not logged.",
    apply: () => {
      const start = daysAgo(14);
      setTrackingStarted(start);
      const data: WorkoutsData = {};
      const today = getTodayKey();
      for (let i = 1; i <= 13; i++) {
        const key = daysAgo(i);
        if (key >= start && key < today && !isRestDay(key)) data[key] = { completed: true };
      }
      setWorkouts(data);
      clearForgivenAt();
    },
  },
  {
    id: "completed",
    name: "Completed today",
    description: "Today logged. Home shows “Completed”, green card.",
    apply: () => {
      const today = getTodayKey();
      setTrackingStarted(daysAgo(7));
      setWorkouts({ [today]: { completed: true } });
      clearForgivenAt();
    },
  },
  {
    id: "forgiven",
    name: "Forgiven (after I am ashamed)",
    description: "Same as 2nd day miss but forgiven today. Home should not show “I am ashamed”.",
    apply: () => {
      setTrackingStarted(daysAgo(6));
      setWorkouts({});
      setForgivenAt(getTodayKey());
    },
  },
];

/** Info-only: how to see these UIs (no data change). */
const infoOnly: { id: string; name: string; description: string }[] = [
  {
    id: "rest-day",
    name: "Rest day (grey)",
    description: "Set your device date to Saturday or Sunday. Home shows “Rest day” and grey card.",
  },
  {
    id: "approaching-end",
    name: "Approaching end (red pulse)",
    description: "On a weekday, set device time after 11:45 (or your “before work” time). With today not logged, the status card pulses red.",
  },
];

export default function SimulatePage() {
  const handleApply = (apply: () => void) => {
    apply();
    // Full reload so home always reads fresh from localStorage (fixes forgiven / 2nd-miss state).
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-8">
      <h1 className="text-xl font-semibold text-white">Simulate UI states</h1>
      <p className="mt-1 text-sm text-slate-400">
        Apply a scenario to see how the home (and app) behave. Then open Home, Checklist, or History.
      </p>

      <ul className="mt-6 space-y-3">
        {scenarios.map(({ id, name, description, apply }) => (
          <li
            key={id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4"
          >
            <p className="font-medium text-white">{name}</p>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleApply(apply)}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-surface transition hover:bg-green-400"
              >
                Apply & go to Home
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        See these UIs manually
      </h2>
      <ul className="mt-3 space-y-3">
        {infoOnly.map(({ id, name, description }) => (
          <li
            key={id}
            className="rounded-xl border border-slate-700/50 border-dashed bg-slate-800/20 p-4"
          >
            <p className="font-medium text-slate-300">{name}</p>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-6 inline-block text-sm text-accent underline"
      >
        Back to Home
      </Link>
    </div>
  );
}
