import { NextResponse } from "next/server";
import {
  operationsAuthorized,
  processNotifications,
  reconcileNotificationDelivery,
} from "@/lib/notifications";
import { getPool } from "@/lib/db";
import { operationHealth, queueStaffDigest } from "@/lib/operations-health";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!operationsAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getPool();
    // Keep the slower daily health check separate from provider sends so both fit the execution limit.
    if (new URL(request.url).searchParams.get("daily") === "1")
      return NextResponse.json(
        { daily: await queueStaffDigest(db) },
        {
          headers: { "Cache-Control": "no-store" },
        },
      );
    const result = new URL(request.url).searchParams.get("delivery") === "1"
      ? await reconcileNotificationDelivery(db)
      : await processNotifications(db);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Operations check failed" },
      { status: 503 },
    );
  }
}
export async function GET(request: Request) {
  if (!operationsAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await operationHealth(getPool()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Health check unavailable" },
      { status: 503 },
    );
  }
}
