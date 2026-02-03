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
  return NextResponse.json(status);
}
