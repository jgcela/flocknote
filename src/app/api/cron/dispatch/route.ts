import { timingSafeEqual } from "node:crypto";
import { dispatchPending } from "@/lib/messaging/dispatch";

export const maxDuration = 300;

/**
 * Call every few minutes (e.g. Vercel Cron) with
 * `Authorization: Bearer $CRON_SECRET`. Sends scheduled broadcasts and resumes
 * interrupted ones.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const processed = await dispatchPending();
  return Response.json({ processed });
}
