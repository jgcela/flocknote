import "server-only";
import type { DeliveryStatus } from "@prisma/client";
import { prisma } from "../db";
import { tenantDb } from "../tenant-db";
import { refreshCommunicationTotals } from "./dispatch";

const RANK: Record<DeliveryStatus, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  OPENED: 3,
  BOUNCED: 4,
  FAILED: 4,
  UNSUBSCRIBED: 5,
};

/**
 * Apply a provider delivery event. Events can arrive out of order, so a row
 * never moves backwards (e.g. "delivered" after "opened" is ignored).
 */
export async function applyDeliveryEvent(
  providerMessageId: string,
  status: DeliveryStatus,
  extra: { error?: string; at?: Date; optOut?: "email" | "sms" } = {},
) {
  const row = await prisma.communicationRecipient.findFirst({
    where: { providerMessageId },
    select: { id: true, organizationId: true, communicationId: true, status: true, memberId: true },
  });
  if (!row) return false;
  const db = tenantDb(row.organizationId);

  if (RANK[status] > RANK[row.status]) {
    const at = extra.at ?? new Date();
    await db.communicationRecipient.update({
      where: { id: row.id },
      data: {
        status,
        ...(status === "DELIVERED" ? { deliveredAt: at } : {}),
        ...(status === "OPENED" ? { openedAt: at } : {}),
        ...(extra.error ? { errorMessage: extra.error.slice(0, 500) } : {}),
      },
    });
    await refreshCommunicationTotals(db, row.communicationId);
  }
  if (extra.optOut && row.memberId) {
    await db.member.update({
      where: { id: row.memberId },
      data: extra.optOut === "email" ? { emailOptIn: false } : { smsOptIn: false },
    });
  }
  return true;
}
