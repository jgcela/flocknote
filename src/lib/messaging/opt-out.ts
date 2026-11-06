import "server-only";
import { tenantDb } from "../tenant-db";
import { parseUnsubscribeToken } from "../unsubscribe";

/** Apply a signed unsubscribe token. Returns the church name, or null if invalid. */
export async function unsubscribeWithToken(token: string) {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) return null;
  const db = tenantDb(parsed.organizationId);
  const member = await db.member.findUnique({ where: { id: parsed.memberId }, select: { id: true, organization: { select: { name: true } } } });
  if (!member) return null;
  await db.member.update({
    where: { id: member.id },
    data: parsed.channel === "email" ? { emailOptIn: false } : { smsOptIn: false },
  });
  return { churchName: member.organization.name, channel: parsed.channel };
}

export async function describeUnsubscribeToken(token: string) {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) return null;
  const db = tenantDb(parsed.organizationId);
  const member = await db.member.findUnique({
    where: { id: parsed.memberId },
    select: { emailOptIn: true, smsOptIn: true, organization: { select: { name: true } } },
  });
  if (!member) return null;
  return {
    churchName: member.organization.name,
    channel: parsed.channel,
    alreadyOut: parsed.channel === "email" ? !member.emailOptIn : !member.smsOptIn,
  };
}
