import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, non-expiring unsubscribe tokens: "<memberId>.<orgId>.<channel>.<sig>".
 * No database row is needed, so every email can carry a working link.
 */
type Channel = "email" | "sms";

function secret() {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET (or UNSUBSCRIBE_SECRET) must be set");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`unsubscribe:${payload}`).digest("base64url").slice(0, 32);
}

export function unsubscribeToken(memberId: string, organizationId: string, channel: Channel = "email") {
  const payload = `${memberId}.${organizationId}.${channel}`;
  return `${payload}.${sign(payload)}`;
}

export function parseUnsubscribeToken(token: string): { memberId: string; organizationId: string; channel: Channel } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [memberId, organizationId, channel, sig] = parts as [string, string, string, string];
  if (channel !== "email" && channel !== "sms") return null;
  const expected = sign(`${memberId}.${organizationId}.${channel}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { memberId, organizationId, channel };
}
