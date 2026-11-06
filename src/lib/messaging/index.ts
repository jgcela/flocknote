import "server-only";
import { ConsoleEmailProvider } from "./console";
import type { EmailMessage, EmailProvider, SendResult } from "./types";

export type { EmailMessage, SendResult } from "./types";

let emailProvider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  emailProvider ??= new ConsoleEmailProvider();
  return emailProvider;
}

/** Account emails (invitations, password resets). Never throws. */
export async function sendTransactionalEmail(message: EmailMessage): Promise<SendResult> {
  try {
    return await getEmailProvider().sendEmail(message);
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
