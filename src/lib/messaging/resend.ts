import type { EmailMessage, EmailProvider, SendResult } from "./types";

type FetchLike = typeof fetch;

/** "Name <a@b>" or "a@b" + "Grace Church" → "Grace Church <a@b>". */
export function withDisplayName(from: string, name: string) {
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  const safe = name.replace(/["<>\r\n]/g, "").trim();
  return safe ? `"${safe}" <${address}>` : address;
}

/**
 * Resend adapter (https://resend.com/docs/api-reference). Uses the batch
 * endpoint so a 300-person broadcast is 3 API calls, not 300.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  readonly maxBatch = 100;

  constructor(
    private readonly opts: { apiKey: string; from: string; replyTo?: string; fetch?: FetchLike; baseUrl?: string },
  ) {}

  private body(m: EmailMessage) {
    const replyTo = m.replyTo ?? this.opts.replyTo;
    return {
      from: m.fromName ? withDisplayName(this.opts.from, m.fromName) : this.opts.from,
      to: [m.to],
      subject: m.subject,
      text: m.text,
      ...(m.html ? { html: m.html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(m.headers ? { headers: m.headers } : {}),
    };
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    if (messages.length === 0) return [];
    if (messages.length > this.maxBatch) throw new Error(`Resend batches are limited to ${this.maxBatch} emails`);
    const doFetch = this.opts.fetch ?? fetch;
    const base = this.opts.baseUrl ?? "https://api.resend.com";
    const single = messages.length === 1;

    let res: Response;
    try {
      res = await doFetch(`${base}/emails${single ? "" : "/batch"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(single ? this.body(messages[0]!) : messages.map((m) => this.body(m))),
      });
    } catch (e) {
      const error = `Resend unreachable: ${e instanceof Error ? e.message : String(e)}`;
      return messages.map(() => ({ ok: false, error }));
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string; data?: { id: string }[]; message?: string; name?: string };
    if (!res.ok) {
      const error = `Resend ${res.status}: ${json.message ?? json.name ?? "request failed"}`;
      return messages.map(() => ({ ok: false, error }));
    }
    if (single) return [{ ok: true, providerMessageId: json.id }];
    return messages.map((_, i) => {
      const id = json.data?.[i]?.id;
      return id ? { ok: true, providerMessageId: id } : { ok: false, error: "Resend did not return an id for this email" };
    });
  }
}
