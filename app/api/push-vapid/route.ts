import { NextResponse } from "next/server";

/** Public key for client-side push subscription (safe to expose). */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json({ error: "VAPID_PUBLIC_KEY not configured" }, { status: 500 });
  }
  return NextResponse.json({ publicKey: key });
}
