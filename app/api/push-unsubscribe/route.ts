import { NextRequest, NextResponse } from "next/server";
import { deleteSubscriptionByEndpointOrId, isPushConfigured } from "@/lib/push-server";

/**
 * POST body: { endpoint?: string, id?: string }
 * Deletes subscription by endpoint or by id (sha256 of endpoint).
 */
export async function POST(request: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { endpoint, id } = body as { endpoint?: string; id?: string };
  const key = typeof endpoint === "string" && endpoint.length > 0 ? endpoint : typeof id === "string" && id.length > 0 ? id : null;
  if (!key) {
    return NextResponse.json({ error: "Missing endpoint or id" }, { status: 400 });
  }
  const removed = await deleteSubscriptionByEndpointOrId(key);
  return NextResponse.json({ ok: true, removed });
}
