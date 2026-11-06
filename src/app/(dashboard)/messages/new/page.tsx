import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { messagingStatus } from "@/lib/messaging";
import { requireTenant } from "@/lib/tenant";
import { SMS_MAX } from "@/lib/messaging/limits";
import { countAudience, sendMessage } from "../actions";
import { ComposeForm } from "../compose-form";

export const metadata: Metadata = { title: "New message" };

export default async function NewMessagePage() {
  const { db } = await requireTenant();
  const groups = await db.group.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const status = messagingStatus();
  const note = (kind: string, name: string, env: string) =>
    name === "console" ? `${kind} are not being sent yet: they are written to the server log. Set ${env} to send for real.` : name.startsWith("error") ? `${kind} can't be sent: ${name.slice(7)}` : undefined;

  return (
    <>
      <PageHeader title="New message" description="Send an email or text to a group or to the whole church." />
      <ComposeForm
        action={sendMessage}
        countAudience={countAudience}
        groups={groups.map((g) => ({ value: g.id, label: g.name }))}
        smsMax={SMS_MAX}
        warnings={{ email: note("Emails", status.email, "RESEND_API_KEY and EMAIL_FROM"), sms: note("Texts", status.sms, "the TWILIO_* variables") }}
      />
    </>
  );
}
