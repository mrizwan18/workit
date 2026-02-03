import { NextRequest, NextResponse } from "next/server";
import { getRedisStatus } from "@/lib/push-server";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return !!(CRON_SECRET && auth === `Bearer ${CRON_SECRET}`);
}

/** Check Redis env and subscription count. Use same Authorization header as send-reminders. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = await getRedisStatus();
  const body =
    status.subsCount === 0 && status.redis === "ok"
      ? { ...status, hint: "Subscriptions are stored in the Redis of the origin that served the subscribe request. If you enabled notifications on localhost or a Preview URL, subs are in that env's Redis. Enable notifications on this app's URL (same origin as this API) so they are stored here." }
      : status;
  return NextResponse.json(body);
}
