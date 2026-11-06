import type { SendResult, SmsMessage, SmsProvider } from "./types";

type FetchLike = typeof fetch;

/** Twilio error codes meaning the recipient opted out or can't get texts. */
const OPTED_OUT_CODES = new Set([21610]);

/** Twilio Programmable Messaging adapter (REST API, no SDK). */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";

  constructor(
    private readonly opts: {
      accountSid: string;
      authToken: string;
      /** Either a sender number (E.164) or a Messaging Service SID (MG…). */
      from?: string;
      messagingServiceSid?: string;
      /** Absolute URL Twilio calls with delivery updates. */
      statusCallbackUrl?: string;
      fetch?: FetchLike;
      baseUrl?: string;
    },
  ) {
    if (!opts.from && !opts.messagingServiceSid) throw new Error("Twilio needs TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID");
  }

  async send(m: SmsMessage): Promise<SendResult> {
    const doFetch = this.opts.fetch ?? fetch;
    const base = this.opts.baseUrl ?? "https://api.twilio.com";
    const form = new URLSearchParams({ To: m.to, Body: m.body });
    if (this.opts.messagingServiceSid) form.set("MessagingServiceSid", this.opts.messagingServiceSid);
    else form.set("From", this.opts.from!);
    if (this.opts.statusCallbackUrl) form.set("StatusCallback", this.opts.statusCallbackUrl);

    let res: Response;
    try {
      res = await doFetch(`${base}/2010-04-01/Accounts/${encodeURIComponent(this.opts.accountSid)}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.opts.accountSid}:${this.opts.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
    } catch (e) {
      return { ok: false, error: `Twilio unreachable: ${e instanceof Error ? e.message : String(e)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: `Twilio ${json.code ?? res.status}: ${json.message ?? "request failed"}`,
        optedOut: json.code !== undefined && OPTED_OUT_CODES.has(json.code),
      };
    }
    return { ok: true, providerMessageId: json.sid };
  }
}
