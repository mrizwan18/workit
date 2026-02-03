import { NextRequest, NextResponse } from "next/server";
import {
  getStoredSubscriptions,
  saveSubscriptions,
  sendPushNotification,
  type StoredSubscription,
} from "@/lib/push-server";
import { NOTIFICATION_COPY } from "@/lib/notifications";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  const url = request.nextUrl;
  const secret = url.searchParams.get("secret");
  return secret === CRON_SECRET;
}

/** Current time as HH:mm in the given IANA timezone. */
function nowHHMMInZone(timezone?: string): string {
  const d = new Date();
  if (timezone) {
    try {
      const s = d.toLocaleTimeString("en-CA", {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      if (s && /^\d{1,2}:\d{2}$/.test(s)) return s;
    } catch {
      // fallback
    }
  }
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Today's date as YYYY-MM-DD in the given timezone. */
function todayKeyInZone(timezone?: string): string {
  if (timezone) {
    try {
      const s = new Date().toLocaleDateString("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().slice(0, 10);
}

type ReminderKey = "morning" | "beforeWork" | "streakRisk";

const REMINDER_KEYS: ReminderKey[] = ["morning", "beforeWork", "streakRisk"];

function getCopy(key: ReminderKey): { title: string; body: string } {
  if (key === "morning") return NOTIFICATION_COPY.morning;
  if (key === "beforeWork") return NOTIFICATION_COPY.afterWindow;
  return NOTIFICATION_COPY.streakRisk;
}

/**
 * Cron target: every minute. For each subscription, if local HH:mm matches a configured
 * time and we haven't sent that slot today, send web push. On 404/410, remove subscription.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await getStoredSubscriptions();
  let sent = 0;
  let deleted = 0;
  let failed = 0;
  const toRemove = new Set<string>();
  const lastSentUpdates = new Map<string, StoredSubscription["lastSent"]>();

  for (const sub of subs) {
    const tz = sub.timezone;
    const today = todayKeyInZone(tz);
    const now = nowHHMMInZone(tz);
    const lastSent = { ...(sub.lastSent ?? {}) };
    let didSend = false;
    let shouldRemove = false;

    for (const key of REMINDER_KEYS) {
      const timeStr = sub.times[key];
      if (now !== timeStr) continue;
      if (lastSent[key] === today) continue;

      const { title, body } = getCopy(key);
      const result = await sendPushNotification(sub, { title, body, url: "/" });

      if (result.ok) {
        lastSent[key] = today;
        lastSentUpdates.set(sub.id, lastSent);
        sent++;
        didSend = true;
        break;
      }

      if (result.statusCode === 404 || result.statusCode === 410) {
        toRemove.add(sub.id);
        deleted++;
        shouldRemove = true;
        if (process.env.NODE_ENV !== "test") {
          console.error(`[send-due-notifications] Expired sub ${sub.id}: ${result.statusCode}`);
        }
        break;
      }

      failed++;
      if (process.env.NODE_ENV !== "test") {
        console.error(`[send-due-notifications] Push failed for ${sub.id}: ${result.message}`);
      }
    }

    if (shouldRemove) toRemove.add(sub.id);
  }

  const remaining: StoredSubscription[] = subs
    .filter((s) => !toRemove.has(s.id))
    .map((s) => {
      const updated = lastSentUpdates.get(s.id);
      if (updated) return { ...s, lastSent: updated };
      return s;
    });

  await saveSubscriptions(remaining);

  return NextResponse.json({
    processed: subs.length,
    sent,
    deleted,
    failed,
  });
}
