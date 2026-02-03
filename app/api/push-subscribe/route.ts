import { NextRequest, NextResponse } from "next/server";
import { getStoredSubscriptions, getStoredSubscriptionsOrError, saveSubscriptions, isPushConfigured, type StoredSubscription } from "@/lib/push-server";

type NotificationTimes = { morning: string; beforeWork: string; streakRisk: string };

function isValidTimes(t: unknown): t is NotificationTimes {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.morning === "string" &&
    typeof o.beforeWork === "string" &&
    typeof o.streakRisk === "string" &&
    /^\d{1,2}:\d{2}$/.test(o.morning) &&
    /^\d{1,2}:\d{2}$/.test(o.beforeWork) &&
    /^\d{1,2}:\d{2}$/.test(o.streakRisk)
  );
}

function isValidSubscription(s: unknown): s is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.endpoint === "string" &&
    o.endpoint.length > 0 &&
    o.keys != null &&
    typeof o.keys === "object" &&
    typeof (o.keys as Record<string, unknown>).p256dh === "string" &&
    typeof (o.keys as Record<string, unknown>).auth === "string"
  );
}

export async function POST(request: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push not configured (missing VAPID or Redis env)" },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { subscription, times, timezone } = body as { subscription?: unknown; times?: unknown; timezone?: unknown };
  if (!isValidSubscription(subscription) || !isValidTimes(times)) {
    return NextResponse.json({ error: "Missing or invalid subscription or times" }, { status: 400 });
  }
  const tz = typeof timezone === "string" && timezone.length > 0 && timezone.length <= 64 ? timezone : undefined;

  const subs = await getStoredSubscriptions();
  const endpoint = subscription.endpoint;
  const existing = subs.find((s) => s.endpoint === endpoint);
  const entry: StoredSubscription = {
    endpoint,
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      expirationTime: (subscription as { expirationTime?: number | null }).expirationTime ?? null,
    },
    times: { morning: times.morning, beforeWork: times.beforeWork, streakRisk: times.streakRisk },
    timezone: tz,
    lastSent: existing?.lastSent,
  };
  const next = subs.filter((s) => s.endpoint !== endpoint);
  next.push(entry);
  const writeOk = await saveSubscriptions(next);

  // Read back so client can confirm the write (same Redis check-redis uses)
  const { subs: after, error: readError } = await getStoredSubscriptionsOrError();
  const res: { ok: boolean; subsCount: number; debug?: string; writeOk?: boolean; readError?: string } = {
    ok: true,
    subsCount: after.length,
    writeOk,
  };
  if (after.length === 0 && next.length > 0) {
    res.debug = "redis_ok_but_read_empty";
    if (readError) res.readError = readError;
  }
  return NextResponse.json(res);
}
