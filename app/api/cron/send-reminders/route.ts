import { NextRequest, NextResponse } from "next/server";
import { getStoredSubscriptions, saveSubscriptions, sendPushNotification } from "@/lib/push-server";
import { NOTIFICATION_COPY } from "@/lib/notifications";
import type { StoredSubscription } from "@/lib/push-server";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return !!(CRON_SECRET && auth === `Bearer ${CRON_SECRET}`);
}

/** Current time as HH:MM in the given IANA timezone, or UTC if invalid/missing. */
function nowHHMMInZone(timezone?: string): string {
  const d = new Date();
  if (timezone) {
    try {
      const s = d.toLocaleTimeString("en-CA", { timeZone: timezone, hour12: false, hour: "2-digit", minute: "2-digit" });
      if (s && /^\d{1,2}:\d{2}$/.test(s)) return s;
    } catch {
      // fallback to UTC
    }
  }
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/** Today's date as YYYY-MM-DD in the given timezone, or UTC if invalid/missing. */
function todayKeyInZone(timezone?: string): string {
  if (timezone) {
    try {
      const s = new Date().toLocaleDateString("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function timeGte(now: string, scheduled: string): boolean {
  return now >= scheduled;
}

type ReminderKey = "morning" | "beforeWork" | "streakRisk";

const REMINDER_ORDER: ReminderKey[] = ["morning", "beforeWork", "streakRisk"];

function getCopy(key: ReminderKey): { title: string; body: string } {
  if (key === "morning") return NOTIFICATION_COPY.morning;
  if (key === "beforeWork") return NOTIFICATION_COPY.afterWindow;
  return NOTIFICATION_COPY.streakRisk;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await getStoredSubscriptions();
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, subs: 0 });
  }

  const updated: StoredSubscription[] = [];
  let sent = 0;

  for (const sub of subs) {
    const tz = sub.timezone;
    const today = todayKeyInZone(tz);
    const now = nowHHMMInZone(tz);
    let lastSent = sub.lastSent?.date === today ? { ...sub.lastSent } : { date: today, morning: false, beforeWork: false, streakRisk: false };
    let changed = false;

    for (const key of REMINDER_ORDER) {
      const timeStr = sub.times[key];
      if (lastSent[key]) continue;
      if (!timeGte(now, timeStr)) continue;

      const { title, body } = getCopy(key);
      const ok = await sendPushNotification(sub.subscription, { title, body });
      if (ok) {
        lastSent[key] = true;
        changed = true;
        sent++;
      }
    }

    updated.push({
      ...sub,
      lastSent: changed ? lastSent : sub.lastSent,
    });
  }

  await saveSubscriptions(updated);
  return NextResponse.json({ ok: true, sent, subs: subs.length });
}
