"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getTodayKey,
  getEntry,
  logChecklist,
  canLogDate,
  getTrackingStartedDate,
  type ChecklistKeys,
} from "@/lib/storage";

const ITEMS: { key: ChecklistKeys; label: string; description: string }[] = [
  {
    key: "warmup",
    label: "Warm-up",
    description: "Light cardio or dynamic moves (e.g. jog, jump rope, arm circles) to raise heart rate and loosen muscles before lifting.",
  },
  {
    key: "main",
    label: "Main lifts",
    description: "Primary compound movements: squat, deadlift, bench, overhead press, or rows. The core of your session.",
  },
  {
    key: "accessories",
    label: "Accessories",
    description: "Isolation or secondary work: curls, triceps, calves, face pulls, etc. Targets specific muscles after main lifts.",
  },
  {
    key: "stretch",
    label: "Stretch",
    description: "Static or dynamic stretching, mobility work, or cool-down to improve flexibility and recovery.",
  },
];

const TOTAL_ITEMS = 4;
const MIN_FOR_WORKOUT = 2;

const defaultChecklist: Record<ChecklistKeys, boolean> = {
  warmup: false,
  main: false,
  accessories: false,
  stretch: false,
};

export default function ChecklistPage() {
  const today = getTodayKey();
  const [checklist, setChecklist] = useState<Record<ChecklistKeys, boolean>>(defaultChecklist);
  const [mounted, setMounted] = useState(false);
  const [trackingStarted, setTrackingStartedState] = useState<boolean | null>(null);

  const load = useCallback(() => {
    setTrackingStartedState(!!getTrackingStartedDate());
    const entry = getEntry(today);
    if (entry?.checklist) {
      setChecklist({ ...defaultChecklist, ...entry.checklist });
    } else {
      setChecklist(defaultChecklist);
    }
  }, [today]);

  useEffect(() => {
    setMounted(true);
    load();
  }, [load]);

  const toggle = (key: ChecklistKeys) => {
    if (!canLogDate(today)) return;
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    logChecklist(today, next);
  };

  const selectAll = () => {
    if (!canLogDate(today)) return;
    const next: Record<ChecklistKeys, boolean> = { warmup: true, main: true, accessories: true, stretch: true };
    setChecklist(next);
    logChecklist(today, next);
  };

  const clearAll = () => {
    if (!canLogDate(today)) return;
    const next: Record<ChecklistKeys, boolean> = { warmup: false, main: false, accessories: false, stretch: false };
    setChecklist(next);
    logChecklist(today, next);
  };

  const ticked = Object.values(checklist).filter(Boolean).length;
  const countsAsWorkout = ticked >= MIN_FOR_WORKOUT;
  const locked = !canLogDate(today);
  const progressPct = (ticked / TOTAL_ITEMS) * 100;

  if (!mounted) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-4">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!trackingStarted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-12 text-center">
        <h1 className="text-xl font-semibold text-white">Checklist</h1>
        <p className="mt-4 text-slate-400">Start tracking from the home page first.</p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-accent px-6 py-3 font-semibold text-surface transition hover:bg-green-400 active:scale-[0.98]"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-8">
      <h1 className="text-xl font-semibold text-white">Workout Checklist</h1>
      <p className="mt-1 text-sm text-slate-400">
        Tick at least {MIN_FOR_WORKOUT} items to count as a workout.
      </p>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Progress</span>
          <span className={countsAsWorkout ? "font-medium text-accent" : "text-slate-400"}>
            {ticked}/{TOTAL_ITEMS}
            {countsAsWorkout && " — counts as workout"}
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700/60"
          role="progressbar"
          aria-valuenow={ticked}
          aria-valuemin={0}
          aria-valuemax={TOTAL_ITEMS}
          aria-label={`${ticked} of ${TOTAL_ITEMS} items completed`}
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Select all / Clear all */}
      {!locked && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/50"
          >
            Clear all
          </button>
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {ITEMS.map(({ key, label, description }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => toggle(key)}
              disabled={locked}
              className={`flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left transition ${
                checklist[key]
                  ? "border-accent/50 bg-accent/10"
                  : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
              } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  checklist[key]
                    ? "border-accent bg-accent"
                    : "border-slate-500 bg-transparent"
                }`}
                aria-hidden
              >
                {checklist[key] && (
                  <svg className="h-3.5 w-3.5 text-surface" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-6" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white">{label}</span>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {locked && (
        <p className="mt-6 text-center text-sm text-amber-400">
          You can only edit today. Past days are locked.
        </p>
      )}
    </div>
  );
}
