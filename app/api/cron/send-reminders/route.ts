import { NextRequest, NextResponse } from "next/server";
import { getStoredSubscriptions, saveSubscriptions, sendPushNotification } from "@/lib/push-server";
import { NOTIFICATION_COPY } from "@/lib/notifications";
import type { StoredSubscription } from "@/lib/push-server";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (process.env.VERCEL === "1" && request.headers.get("x-vercel-cron") === "1") return true;
  const auth = request.headers.get("authorization");
  return !!(CRON_SECRET && auth === `Bearer ${CRON_SECRET}`);
}

function nowHHMM(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compare "HH:MM" strings (lexicographic order is correct for times). */
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
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const now = nowHHMM();
  const today = todayKey();
  let sent = 0;
  const updated: StoredSubscription[] = [];

  for (const sub of subs) {
    let lastSent = sub.lastSent?.date === today ? { ...sub.lastSent } : { date: today, morning: false, beforeWork: false, streakRisk: false };
    let changed = false;

    for (const key of REMINDER_ORDER) {
      const timeStr = sub.times[key];
      const alreadySent = lastSent[key];
      if (alreadySent) continue;
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
  return NextResponse.json({ ok: true, sent });
}
