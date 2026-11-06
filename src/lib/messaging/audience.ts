import type { CommunicationChannel, Prisma } from "@prisma/client";
import type { TenantDb } from "../tenant-db";

export type Recipient = { memberId: string; address: string; name: string };

/**
 * Who receives a broadcast. Rules:
 * - Only ACTIVE and VISITOR people; never anyone who unsubscribed church-wide.
 * - Email needs an address and emailOptIn; text needs a phone and smsOptIn.
 * - Group message: the person's subscription must allow that channel.
 * - Whole-church message: the person's preferred channel must include it.
 * - Duplicate addresses (e.g. a shared family email) get one copy.
 */
export async function resolveRecipients(db: TenantDb, channel: CommunicationChannel, groupId: string | null): Promise<Recipient[]> {
  const isEmail = channel === "EMAIL";
  const where: Prisma.MemberWhereInput = {
    status: { in: ["ACTIVE", "VISITOR"] },
    unsubscribedAt: null,
    ...(isEmail ? { emailOptIn: true, email: { not: null } } : { smsOptIn: true, phone: { not: null } }),
    ...(groupId
      ? { groupMemberships: { some: { groupId, unsubscribedAt: null, ...(isEmail ? { emailEnabled: true } : { smsEnabled: true }) } } }
      : { preferredChannel: { in: isEmail ? ["EMAIL", "BOTH"] : ["SMS", "BOTH"] } }),
  };
  const members = await db.member.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, email: true, phone: true, firstName: true, preferredName: true, lastName: true },
  });

  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const m of members) {
    const address = (isEmail ? m.email : m.phone)?.trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ memberId: m.id, address, name: `${m.preferredName || m.firstName} ${m.lastName}` });
  }
  return out;
}
