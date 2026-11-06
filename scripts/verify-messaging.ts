/**
 * Messaging checks: provider adapters (mocked HTTP), webhook signatures,
 * audience rules and the dispatch queue (console providers). Run after seeding:
 *   npx tsx --conditions=react-server scripts/verify-messaging.ts
 */
import { prisma } from "../src/lib/db";
import { resolveRecipients } from "../src/lib/messaging/audience";
import { dispatchCommunication, queueCommunication } from "../src/lib/messaging/dispatch";
import { ResendEmailProvider, withDisplayName } from "../src/lib/messaging/resend";
import { applyDeliveryEvent } from "../src/lib/messaging/status-updates";
import { TwilioSmsProvider } from "../src/lib/messaging/twilio";
import { svixSignature, twilioSignature, verifySvix, verifyTwilioSignature } from "../src/lib/messaging/webhooks";
import { tenantDb } from "../src/lib/tenant-db";
import { parseUnsubscribeToken, unsubscribeToken } from "../src/lib/unsubscribe";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}

type Call = { url: string; init: RequestInit };
function mockFetch(responses: { status: number; json: unknown }[]) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const r = responses.shift() ?? { status: 500, json: {} };
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { fn, calls };
}

async function adapters() {
  // Resend: single send uses /emails, batches use /emails/batch.
  let m = mockFetch([{ status: 200, json: { id: "re_1" } }]);
  let resend = new ResendEmailProvider({ apiKey: "k", from: "Fold <no-reply@example.org>", fetch: m.fn });
  let res = await resend.sendBatch([{ to: "a@example.org", subject: "Hi", text: "Body", fromName: "Grace Church" }]);
  const sent = JSON.parse(String(m.calls[0]!.init.body));
  check("resend single → /emails", m.calls[0]!.url.endsWith("/emails"));
  check("resend uses church name as sender", sent.from === '"Grace Church" <no-reply@example.org>');
  check("resend returns provider id", res[0]!.ok && res[0]!.providerMessageId === "re_1");

  m = mockFetch([{ status: 200, json: { data: [{ id: "re_a" }, { id: "re_b" }] } }]);
  resend = new ResendEmailProvider({ apiKey: "k", from: "no-reply@example.org", fetch: m.fn });
  res = await resend.sendBatch([
    { to: "a@example.org", subject: "s", text: "t" },
    { to: "b@example.org", subject: "s", text: "t", headers: { "List-Unsubscribe": "<https://x>" } },
  ]);
  check("resend batch → /emails/batch", m.calls[0]!.url.endsWith("/emails/batch"));
  check("resend batch ids in order", res.map((r) => (r.ok ? r.providerMessageId : "")).join() === "re_a,re_b");
  check("resend passes headers", JSON.parse(String(m.calls[0]!.init.body))[1].headers["List-Unsubscribe"] === "<https://x>");

  m = mockFetch([{ status: 422, json: { name: "validation_error", message: "Invalid `from` field" } }]);
  resend = new ResendEmailProvider({ apiKey: "k", from: "bad", fetch: m.fn });
  res = await resend.sendBatch([{ to: "a@example.org", subject: "s", text: "t" }]);
  check("resend error surfaces message", !res[0]!.ok && res[0]!.error.includes("Invalid `from` field"));
  check("display name strips quotes/brackets", withDisplayName("x@y.org", 'St "Mark\'s" <Parish>') === '"St Mark\'s Parish" <x@y.org>');

  // Twilio
  let t = mockFetch([{ status: 201, json: { sid: "SM123" } }]);
  let twilio = new TwilioSmsProvider({ accountSid: "AC1", authToken: "tok", from: "+15550000000", statusCallbackUrl: "https://app/cb", fetch: t.fn });
  let sr = await twilio.send({ to: "+15551112222", body: "Hello" });
  const form = new URLSearchParams(String(t.calls[0]!.init.body));
  check("twilio posts to account Messages.json", t.calls[0]!.url.endsWith("/2010-04-01/Accounts/AC1/Messages.json"));
  check("twilio sends To/From/Body/StatusCallback", form.get("To") === "+15551112222" && form.get("From") === "+15550000000" && form.get("Body") === "Hello" && form.get("StatusCallback") === "https://app/cb");
  check("twilio basic auth", (t.calls[0]!.init.headers as Record<string, string>).Authorization === `Basic ${Buffer.from("AC1:tok").toString("base64")}`);
  check("twilio returns sid", sr.ok && sr.providerMessageId === "SM123");

  t = mockFetch([{ status: 400, json: { code: 21610, message: "Attempt to send to unsubscribed recipient" } }]);
  twilio = new TwilioSmsProvider({ accountSid: "AC1", authToken: "tok", messagingServiceSid: "MG1", fetch: t.fn });
  sr = await twilio.send({ to: "+15551112222", body: "Hello" });
  check("twilio uses messaging service when set", new URLSearchParams(String(t.calls[0]!.init.body)).get("MessagingServiceSid") === "MG1");
  check("twilio 21610 flagged as opted out", !sr.ok && sr.optedOut === true);
}

function signatures() {
  const params = { MessageSid: "SM1", MessageStatus: "delivered" };
  const sig = twilioSignature("tok", "https://app/api/webhooks/twilio", params);
  check("twilio signature accepted", verifyTwilioSignature("tok", "https://app/api/webhooks/twilio", params, sig));
  check("twilio signature rejects tampered params", !verifyTwilioSignature("tok", "https://app/api/webhooks/twilio", { ...params, MessageStatus: "failed" }, sig));
  check("twilio signature rejects missing header", !verifyTwilioSignature("tok", "https://app/api/webhooks/twilio", params, null));

  const secret = `whsec_${Buffer.from("super-secret-key").toString("base64")}`;
  const now = Math.floor(Date.now() / 1000);
  const body = '{"type":"email.delivered"}';
  const s = svixSignature(secret, "msg_1", String(now), body);
  check("svix signature accepted", verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: `v1,bogus v1,${s}` }, body, now));
  check("svix rejects tampered body", !verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: `v1,${s}` }, body + " ", now));
  check("svix rejects old timestamp", !verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: `v1,${s}` }, body, now + 600));

  const tok = unsubscribeToken("mem1", "org1");
  check("unsubscribe token round-trips", parseUnsubscribeToken(tok)?.memberId === "mem1");
  check("unsubscribe token rejects forgery", parseUnsubscribeToken(tok.replace("mem1", "mem2")) === null);
}

async function pipeline() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "grace-fellowship" } });
  const other = await prisma.organization.findUniqueOrThrow({ where: { slug: "st-marks" } });
  const db = tenantDb(org.id);

  const emailAll = await resolveRecipients(db, "EMAIL", null);
  check("audience: whole-church email only own church", emailAll.length > 0 && (await prisma.member.count({ where: { id: { in: emailAll.map((r) => r.memberId) }, organizationId: other.id } })) === 0);

  const worship = await db.group.findFirstOrThrow({ where: { name: "Worship Team" } });
  const smsGroup = await resolveRecipients(db, "SMS", worship.id);
  const smsMembers = await db.member.findMany({ where: { id: { in: smsGroup.map((r) => r.memberId) } } });
  check("audience: group SMS needs smsOptIn and phone", smsMembers.every((m) => m.smsOptIn && m.phone));

  // Opt someone out and make sure they're excluded.
  const target = emailAll[0]!;
  await db.member.update({ where: { id: target.memberId }, data: { emailOptIn: false } });
  check("audience: opted-out person excluded", !(await resolveRecipients(db, "EMAIL", null)).some((r) => r.memberId === target.memberId));
  await db.member.update({ where: { id: target.memberId }, data: { emailOptIn: true } });

  const comm = await db.communication.create({ data: { organizationId: org.id, channel: "EMAIL", subject: "Verify", body: "Test body", status: "DRAFT" } });
  const queued = await queueCommunication(org.id, comm.id);
  // Two workers at once must not double-send.
  await Promise.all([dispatchCommunication(org.id, comm.id), dispatchCommunication(org.id, comm.id)]);
  const after = await db.communication.findUniqueOrThrow({ where: { id: comm.id }, include: { recipients: true } });
  check("dispatch: every recipient sent once", queued > 0 && after.recipients.length === queued && after.recipients.every((r) => r.status === "SENT" && r.providerMessageId));
  check("dispatch: unique provider ids (no double send)", new Set(after.recipients.map((r) => r.providerMessageId)).size === queued);
  check("dispatch: broadcast marked SENT with totals", after.status === "SENT" && after.deliveredCount === queued && after.recipientCount === queued);

  const first = after.recipients[0]!;
  await applyDeliveryEvent(first.providerMessageId!, "OPENED");
  await applyDeliveryEvent(first.providerMessageId!, "DELIVERED");
  const row = await db.communicationRecipient.findUniqueOrThrow({ where: { id: first.id } });
  check("webhook events never move status backwards", row.status === "OPENED" && row.openedAt !== null);

  const second = after.recipients[1]!;
  await applyDeliveryEvent(second.providerMessageId!, "UNSUBSCRIBED", { optOut: "email" });
  const m2 = await db.member.findUniqueOrThrow({ where: { id: second.memberId! } });
  check("spam complaint turns off email", m2.emailOptIn === false);
  await db.member.update({ where: { id: m2.id }, data: { emailOptIn: true } });

  check("tenant: other church can't see broadcast", (await tenantDb(other.id).communication.findUnique({ where: { id: comm.id } })) === null);
  await prisma.communication.delete({ where: { id: comm.id } });
}

async function main() {
  process.env.EMAIL_PROVIDER = "console";
  process.env.SMS_PROVIDER = "console";
  const log = console.info;
  console.info = () => {};
  try {
    await adapters();
    signatures();
    await pipeline();
  } finally {
    console.info = log;
  }
  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll messaging checks passed.");
}

main().finally(() => prisma.$disconnect());
