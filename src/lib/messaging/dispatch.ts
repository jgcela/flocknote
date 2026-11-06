import "server-only";
import { randomUUID } from "node:crypto";
import type { DeliveryStatus } from "@prisma/client";
import { prisma } from "../db";
import { appUrl } from "../request-meta";
import { tenantDb, type TenantDb } from "../tenant-db";
import { unsubscribeToken } from "../unsubscribe";
import { getEmailProvider, getSmsProvider } from "./index";
import type { EmailMessage, SendResult } from "./types";

const CLAIM_STALE_MS = 10 * 60 * 1000;
const SMS_CONCURRENCY = 5;
/** Pause between email batches; Resend's default limit is 2 requests/second. */
const EMAIL_BATCH_PAUSE_MS = 600;

const OK_STATUSES: DeliveryStatus[] = ["SENT", "DELIVERED", "OPENED"];
const FAILED_STATUSES: DeliveryStatus[] = ["FAILED", "BOUNCED", "UNSUBSCRIBED"];

export const SMS_OPT_OUT_FOOTER = "Reply STOP to opt out.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Recount a broadcast's totals from its delivery log and settle its status. */
export async function refreshCommunicationTotals(db: TenantDb, communicationId: string) {
  const counts = await db.communicationRecipient.groupBy({ by: ["status"], where: { communicationId }, _count: true });
  const n = (statuses: DeliveryStatus[]) => counts.filter((c) => statuses.includes(c.status)).reduce((a, c) => a + c._count, 0);
  const total = counts.reduce((a, c) => a + c._count, 0);
  const queued = n(["QUEUED"]);
  const delivered = n(OK_STATUSES);
  const failed = n(FAILED_STATUSES);

  const comm = await db.communication.findUnique({ where: { id: communicationId }, select: { status: true } });
  const done = queued === 0 && comm?.status === "SENDING";
  await db.communication.update({
    where: { id: communicationId },
    data: {
      recipientCount: total,
      deliveredCount: delivered,
      failedCount: failed,
      ...(done ? { status: total > 0 && delivered === 0 ? "FAILED" : "SENT", sentAt: new Date() } : {}),
    },
  });
}

/** Take up to `limit` queued rows for this worker. */
async function claim(db: TenantDb, communicationId: string, limit: number) {
  const stale = new Date(Date.now() - CLAIM_STALE_MS);
  const candidates = await db.communicationRecipient.findMany({
    where: { communicationId, status: "QUEUED", OR: [{ claimToken: null }, { claimedAt: { lt: stale } }] },
    select: { id: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });
  if (candidates.length === 0) return [];
  const token = randomUUID();
  await db.communicationRecipient.updateMany({
    where: { id: { in: candidates.map((c) => c.id) }, status: "QUEUED", OR: [{ claimToken: null }, { claimedAt: { lt: stale } }] },
    data: { claimToken: token, claimedAt: new Date() },
  });
  return db.communicationRecipient.findMany({
    where: { claimToken: token },
    select: { id: true, address: true, memberId: true },
  });
}

async function record(db: TenantDb, rowId: string, memberId: string | null, result: SendResult, channel: "EMAIL" | "SMS") {
  if (result.ok) {
    await db.communicationRecipient.update({
      where: { id: rowId },
      data: { status: "SENT", providerMessageId: result.providerMessageId ?? null, errorMessage: null, claimToken: null },
    });
    return;
  }
  await db.communicationRecipient.update({
    where: { id: rowId },
    data: { status: result.optedOut ? "UNSUBSCRIBED" : "FAILED", errorMessage: result.error.slice(0, 500), claimToken: null },
  });
  // Respect carrier-level STOP: stop texting this person everywhere.
  if (result.optedOut && memberId && channel === "SMS") {
    await db.member.update({ where: { id: memberId }, data: { smsOptIn: false } });
  }
}

/**
 * Send every queued recipient of one broadcast. Safe to call more than once
 * or in parallel: rows are claimed before sending.
 */
export async function dispatchCommunication(organizationId: string, communicationId: string) {
  const db = tenantDb(organizationId);
  const comm = await db.communication.findUnique({
    where: { id: communicationId },
    include: { organization: { select: { name: true, email: true } } },
  });
  if (!comm || comm.status !== "SENDING") return;

  if (comm.channel === "EMAIL") {
    const provider = getEmailProvider();
    for (;;) {
      const rows = await claim(db, communicationId, provider.maxBatch);
      if (rows.length === 0) break;
      const messages: EmailMessage[] = rows.map((r) => {
        const token = r.memberId ? unsubscribeToken(r.memberId, organizationId) : null;
        const unsub = token ? appUrl(`u/${token}`) : null;
        const oneClick = token ? appUrl(`api/unsubscribe/${token}`) : null;
        return {
          to: r.address,
          subject: comm.subject ?? comm.organization.name,
          fromName: comm.organization.name,
          replyTo: comm.organization.email ?? undefined,
          text: unsub ? `${comm.body}\n\n—\n${comm.organization.name}\nUnsubscribe: ${unsub}` : comm.body,
          headers: oneClick ? { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
        };
      });
      let results: SendResult[];
      try {
        results = await provider.sendBatch(messages);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        results = messages.map(() => ({ ok: false, error }));
      }
      for (const [i, row] of rows.entries()) await record(db, row.id, row.memberId, results[i] ?? { ok: false, error: "No result" }, "EMAIL");
      await refreshCommunicationTotals(db, communicationId);
      if (rows.length === provider.maxBatch) await sleep(EMAIL_BATCH_PAUSE_MS);
    }
  } else {
    const provider = getSmsProvider();
    const body = comm.body.includes("STOP") ? comm.body : `${comm.body}\n${SMS_OPT_OUT_FOOTER}`;
    for (;;) {
      const rows = await claim(db, communicationId, SMS_CONCURRENCY * 4);
      if (rows.length === 0) break;
      for (let i = 0; i < rows.length; i += SMS_CONCURRENCY) {
        await Promise.all(
          rows.slice(i, i + SMS_CONCURRENCY).map(async (row) => {
            let result: SendResult;
            try {
              result = await provider.send({ to: row.address, body });
            } catch (e) {
              result = { ok: false, error: e instanceof Error ? e.message : String(e) };
            }
            await record(db, row.id, row.memberId, result, "SMS");
          }),
        );
      }
      await refreshCommunicationTotals(db, communicationId);
    }
  }
  await refreshCommunicationTotals(db, communicationId);
}

/**
 * Cron fallback: start broadcasts whose scheduled time has passed and resume
 * any that were interrupted (e.g. the server restarted mid-send).
 */
export async function dispatchPending(now = new Date()) {
  const due = await prisma.communication.findMany({
    where: { OR: [{ status: "SENDING" }, { status: "SCHEDULED", scheduledFor: { lte: now } }] },
    select: { id: true, organizationId: true, status: true },
    take: 50,
  });
  for (const c of due) {
    if (c.status === "SCHEDULED") {
      await queueCommunication(c.organizationId, c.id);
    }
    await dispatchCommunication(c.organizationId, c.id);
  }
  return due.length;
}

/**
 * Freeze the recipient list and move the broadcast to SENDING. Returns the
 * number of recipients queued.
 */
export async function queueCommunication(organizationId: string, communicationId: string) {
  const { resolveRecipients } = await import("./audience");
  const db = tenantDb(organizationId);
  const comm = await db.communication.findUnique({ where: { id: communicationId } });
  if (!comm || (comm.status !== "SCHEDULED" && comm.status !== "DRAFT")) return 0;
  const recipients = await resolveRecipients(db, comm.channel, comm.groupId);
  await db.$transaction([
    db.communicationRecipient.createMany({
      data: recipients.map((r) => ({ organizationId, communicationId, memberId: r.memberId, address: r.address })),
      skipDuplicates: true,
    }),
    db.communication.update({ where: { id: communicationId }, data: { status: recipients.length ? "SENDING" : "FAILED", recipientCount: recipients.length } }),
  ]);
  return recipients.length;
}
