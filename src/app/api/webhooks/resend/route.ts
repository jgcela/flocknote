import type { DeliveryStatus } from "@prisma/client";
import { applyDeliveryEvent } from "@/lib/messaging/status-updates";
import { verifySvix } from "@/lib/messaging/webhooks";

const EVENTS: Record<string, { status: DeliveryStatus; optOut?: boolean }> = {
  "email.sent": { status: "SENT" },
  "email.delivered": { status: "DELIVERED" },
  "email.opened": { status: "OPENED" },
  "email.bounced": { status: "BOUNCED" },
  // A spam complaint is treated as an unsubscribe.
  "email.complained": { status: "UNSUBSCRIBED", optOut: true },
};

/** Resend webhook (signed with Svix). */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Resend webhooks not configured", { status: 404 });

  const body = await req.text();
  const ok = verifySvix(
    secret,
    { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") },
    body,
  );
  if (!ok) return new Response("Invalid signature", { status: 403 });

  const event = JSON.parse(body) as { type?: string; created_at?: string; data?: { email_id?: string; bounce?: { message?: string } } };
  const mapped = EVENTS[event.type ?? ""];
  const id = event.data?.email_id;
  if (mapped && id) {
    await applyDeliveryEvent(id, mapped.status, {
      at: event.created_at ? new Date(event.created_at) : undefined,
      error: mapped.status === "BOUNCED" ? (event.data?.bounce?.message ?? "Bounced") : undefined,
      optOut: mapped.optOut ? "email" : undefined,
    });
  }
  return new Response(null, { status: 204 });
}
