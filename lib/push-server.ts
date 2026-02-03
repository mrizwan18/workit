/**
 * Server-side push: store subscriptions (Upstash Redis) and send via web-push.
 * Used by API routes only.
 */

import webPush from "web-push";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "before-work-push-subscriptions";

export type StoredSubscription = {
  endpoint: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string }; expirationTime?: number | null };
  times: { morning: string; beforeWork: string; streakRisk: string };
  /** User's IANA timezone (e.g. Asia/Karachi) so we compare times in their local time. */
  timezone?: string;
  lastSent?: { date: string; morning?: boolean; beforeWork?: boolean; streakRisk?: boolean };
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function getStoredSubscriptions(): Promise<StoredSubscription[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<string>(REDIS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSubscriptions(subs: StoredSubscription[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(REDIS_KEY, JSON.stringify(subs));
}

export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Send a push notification (payload shown by service worker). */
export async function sendPushNotification(
  subscription: StoredSubscription["subscription"],
  payload: { title: string; body: string }
): Promise<boolean> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) return false;
  try {
    webPush.setVapidDetails("mailto:before-work@localhost", vapidPublic, vapidPrivate);
    await webPush.sendNotification(
      subscription as webPush.PushSubscription,
      JSON.stringify(payload),
      { TTL: 60 }
    );
    return true;
  } catch {
    return false;
  }
}
