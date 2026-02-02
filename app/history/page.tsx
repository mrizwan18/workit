"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCalendarMonth, getTodayKey, getTrackingStartedDate } from "@/lib/storage";

export default function HistoryPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [days, setDays] = useState<{ dateKey: string; completed: boolean; isToday: boolean }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [trackingStarted, setTrackingStartedState] = useState<string | null>(null);

  const load = useCallback(() => {
    setTrackingStartedState(getTrackingStartedDate());
    setDays(getCalendarMonth(year, month));
  }, [year, month]);

  useEffect(() => {
    setMounted(true);
    load();
  }, [load]);

  const today = getTodayKey();
  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const nextMonthFirst = new Date(year, month + 1, 1);
  const nextMonthKey = nextMonthFirst.getFullYear() + "-" + String(nextMonthFirst.getMonth() + 1).padStart(2, "0") + "-" + String(nextMonthFirst.getDate()).padStart(2, "0");
  const nextMonthInFuture = nextMonthKey > today;

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
        <h1 className="text-xl font-semibold text-white">History</h1>
        <p className="mt-4 text-slate-400">
          Your calendar will show here once you start tracking.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-accent px-6 py-3 font-semibold text-surface transition hover:bg-green-400 active:scale-[0.98]"
        >
          Start from Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-8">
      <h1 className="text-xl font-semibold text-white">History</h1>
      <p className="mt-1 text-sm text-slate-400">Green = workout, gray = missed. No editing past days.</p>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-800/30 px-3 py-2">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/50"
        >
          ← Prev
        </button>
        <span className="font-medium text-white">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={nextMonthInFuture}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700/50 disabled:pointer-events-none disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1 text-xs font-medium text-slate-500">
            {d}
          </div>
        ))}
        {(() => {
          const first = new Date(year, month, 1);
          const pad = first.getDay();
          const pads = Array.from({ length: pad }, (_, i) => <div key={`pad-${i}`} />);
          const cells = days.map(({ dateKey, completed, isToday }) => (
            <div
              key={dateKey}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm ${
                isToday ? "ring-2 ring-accent" : ""
              } ${
                completed ? "bg-accent/80 text-surface" : "bg-slate-700/50 text-slate-400"
              }`}
              title={dateKey}
            >
              {new Date(dateKey + "T12:00:00").getDate()}
            </div>
          ));
          return [...pads, ...cells];
        })()}
      </div>

      <div className="mt-6 flex gap-6 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-accent/80" /> Workout
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-slate-700/50" /> Missed
        </span>
      </div>
    </div>
  );
}
