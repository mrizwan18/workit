import { NextResponse } from "next/server";

/** Public key for client-side push subscription (safe to expose). Trimmed; 500 if missing. */
export async function GET() {
  const raw = process.env.VAPID_PUBLIC_KEY;
  if (!raw || typeof raw !== "string") {
    return NextResponse.json({ error: "VAPID_PUBLIC_KEY not configured" }, { status: 500 });
  }
  const publicKey = raw.trim();
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID_PUBLIC_KEY is empty" }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}
