import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Twilio request signature: base64(HMAC-SHA1(authToken, url + sorted key/value
 * pairs)). https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string | null) {
  if (!signature) return false;
  return safeEqual(twilioSignature(authToken, url, params), signature);
}

/**
 * Resend webhooks are signed with Svix: HMAC-SHA256 over
 * "<svix-id>.<svix-timestamp>.<raw body>" with the base64 secret after "whsec_".
 * The header can list several "v1,<sig>" values separated by spaces.
 */
export function svixSignature(secret: string, id: string, timestamp: string, body: string) {
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function verifySvix(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  // Reject replays older/newer than 5 minutes.
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false;
  const expected = svixSignature(secret, id, timestamp, body);
  return signature
    .split(" ")
    .map((part) => part.split(",")[1] ?? "")
    .some((sig) => safeEqual(sig, expected));
}
