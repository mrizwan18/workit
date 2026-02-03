/**
 * Server-side push: store subscriptions (Upstash Redis) and send via web-push.
 * Used by API routes only.
 */

import { createHash } from "crypto";
import webPush from "web-push";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "before-work-push-subscriptions";

export type StoredSubscription = {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  times: { morning: string; beforeWork: string; streakRisk: string };
  timezone?: string;
  createdAt: string;
  lastSent?: {
    morning?: string;
    beforeWork?: string;
    streakRisk?: string;
  };
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function subscriptionId(endpoint: string): string {
  return sha256Hex(endpoint);
}

export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}

export async function getStoredSubscriptions(): Promise<StoredSubscription[]> {
  const out = await getStoredSubscriptionsOrError();
  return out.subs;
}

function normalizeSub(raw: unknown): StoredSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const endpoint = typeof o.endpoint === "string" ? o.endpoint : typeof (o.subscription as Record<string, unknown>)?.endpoint === "string" ? (o.subscription as { endpoint: string }).endpoint : null;
  if (!endpoint) return null;
  let keys = o.keys as { p256dh?: string; auth?: string } | undefined;
  if (!keys && (o.subscription as Record<string, unknown>)?.keys) keys = (o.subscription as { keys: { p256dh: string; auth: string } }).keys;
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null;
  const times = o.times as Record<string, string> | undefined;
  if (!times || typeof times.morning !== "string" || typeof times.beforeWork !== "string" || typeof times.streakRisk !== "string") return null;
  const date = (o.lastSent as { date?: string })?.date;
  const oldLastSent = o.lastSent as { morning?: boolean; beforeWork?: boolean; streakRisk?: boolean; date?: string } | undefined;
  const lastSent: StoredSubscription["lastSent"] = date && oldLastSent
    ? {
        ...(oldLastSent.morning && { morning: date }),
        ...(oldLastSent.beforeWork && { beforeWork: date }),
        ...(oldLastSent.streakRisk && { streakRisk: date }),
      }
    : (o.lastSent as StoredSubscription["lastSent"] | undefined);
  return {
    id: (o.id as string) ?? sha256Hex(endpoint),
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    times: { morning: times.morning, beforeWork: times.beforeWork, streakRisk: times.streakRisk },
    timezone: typeof o.timezone === "string" ? o.timezone : undefined,
    createdAt: (o.createdAt as string) ?? new Date().toISOString(),
    lastSent,
  };
}

export async function getStoredSubscriptionsOrError(): Promise<{
  subs: StoredSubscription[];
  error?: string;
}> {
  const redis = getRedis();
  if (!redis) return { subs: [], error: "redis_null" };
  try {
    const raw = await redis.get<unknown>(REDIS_KEY);
    if (raw == null) return { subs: [] };
    const parsed = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return { subs: [] };
    const subs = parsed.map(normalizeSub).filter((s): s is StoredSubscription => s !== null);
    return { subs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { subs: [], error: msg };
  }
}

export async function saveSubscriptions(subs: StoredSubscription[]): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(REDIS_KEY, JSON.stringify(subs));
    return true;
  } catch {
    return false;
  }
}

export async function deleteSubscriptionByEndpointOrId(endpointOrId: string): Promise<boolean> {
  const subs = await getStoredSubscriptions();
  const id = endpointOrId.length === 64 && /^[a-f0-9]+$/.test(endpointOrId) ? endpointOrId : sha256Hex(endpointOrId);
  const next = subs.filter((s) => s.id !== id && s.endpoint !== endpointOrId);
  if (next.length === subs.length) return false;
  return saveSubscriptions(next);
}

export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function getContactEmail(): string {
  const email = process.env.PUSH_CONTACT_EMAIL;
  if (email && typeof email === "string" && email.startsWith("mailto:")) return email;
  return "mailto:support@example.com";
}

/** For debugging: check Redis connectivity and subscription count. */
export async function getRedisStatus(): Promise<{
  redis: "ok" | "not_configured" | "error";
  subsCount: number;
  redisOrigin?: string;
  message?: string;
}> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { redis: "not_configured", subsCount: 0, message: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing" };
  }
  let redisOrigin: string | undefined;
  try {
    redisOrigin = new URL(url).origin;
  } catch {
    redisOrigin = "(invalid url)";
  }
  try {
    const subs = await getStoredSubscriptions();
    return { redis: "ok", subsCount: subs.length, redisOrigin };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { redis: "error", subsCount: 0, redisOrigin, message: msg };
  }
}

export type SendPushResult = { ok: true } | { ok: false; statusCode?: number; message?: string };

/** Send a push notification. Returns statusCode on failure so caller can delete on 404/410. */
export async function sendPushNotification(
  sub: StoredSubscription,
  payload: { title: string; body: string; url?: string }
): Promise<SendPushResult> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!vapidPublic || !vapidPrivate) return { ok: false, message: "VAPID not configured" };
  try {
    webPush.setVapidDetails(getContactEmail(), vapidPublic, vapidPrivate);
    const pushSub: webPush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    };
    await webPush.sendNotification(pushSub, JSON.stringify(payload), { TTL: 60 });
    return { ok: true };
  } catch (err: unknown) {
    const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode: number }).statusCode : undefined;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, statusCode, message };
  }
}
