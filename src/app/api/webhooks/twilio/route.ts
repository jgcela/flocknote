import type { DeliveryStatus } from "@prisma/client";
import { applyDeliveryEvent } from "@/lib/messaging/status-updates";
import { verifyTwilioSignature } from "@/lib/messaging/webhooks";
import { appUrl } from "@/lib/request-meta";

/** Twilio StatusCallback: delivery updates for texts we sent. */
export async function POST(req: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new Response("Twilio not configured", { status: 404 });

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  // Twilio signs the exact URL it called, which is the one we gave it.
  if (!verifyTwilioSignature(token, appUrl("api/webhooks/twilio"), params, req.headers.get("x-twilio-signature"))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const sid = params.MessageSid;
  const code = params.ErrorCode ? Number(params.ErrorCode) : undefined;
  const map: Record<string, DeliveryStatus> = { sent: "SENT", delivered: "DELIVERED", undelivered: "FAILED", failed: "FAILED" };
  let status = map[params.MessageStatus ?? ""];
  if (sid && status) {
    const optedOut = code === 21610;
    if (optedOut) status = "UNSUBSCRIBED";
    await applyDeliveryEvent(sid, status, {
      error: code ? `Twilio error ${code}` : undefined,
      optOut: optedOut ? "sms" : undefined,
    });
  }
  return new Response(null, { status: 204 });
}
