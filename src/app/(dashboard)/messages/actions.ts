"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { optionalId, zodErrors, type FormState } from "@/lib/form-state";
import { resolveRecipients } from "@/lib/messaging/audience";
import { SMS_MAX } from "@/lib/messaging/limits";
import { dispatchCommunication, queueCommunication } from "@/lib/messaging/dispatch";
import { requireTenant } from "@/lib/tenant";

const schema = z
  .object({
    channel: z.enum(["EMAIL", "SMS"]),
    groupId: optionalId,
    subject: z.string().trim().max(200, "Keep the subject under 200 characters.").optional(),
    body: z.string({ required_error: "Please write your message." }).trim().min(1, "Please write your message.").max(50_000),
  })
  .superRefine((v, ctx) => {
    if (v.channel === "EMAIL" && !v.subject) ctx.addIssue({ code: "custom", path: ["subject"], message: "Please add a subject." });
    if (v.channel === "SMS" && v.body.length > SMS_MAX) {
      ctx.addIssue({ code: "custom", path: ["body"], message: `Texts can be at most ${SMS_MAX} characters (yours has ${v.body.length}).` });
    }
  });

export async function sendMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, organization } = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { channel, groupId, subject, body } = parsed.data;

  if (groupId && !(await db.group.findUnique({ where: { id: groupId }, select: { id: true } }))) {
    return { message: "Please fix the highlighted fields.", errors: { groupId: "That group no longer exists." } };
  }
  const recipients = await resolveRecipients(db, channel, groupId);
  if (recipients.length === 0) {
    return {
      message: "Please fix the highlighted fields.",
      errors: { groupId: `Nobody in this audience can receive ${channel === "SMS" ? "texts" : "email"} right now (check opt-ins and contact details).` },
    };
  }

  const comm = await db.communication.create({
    data: {
      organizationId: organization.id,
      channel,
      groupId,
      subject: channel === "EMAIL" ? subject : null,
      body,
      sentById: user.id,
      status: "DRAFT",
    },
  });
  await queueCommunication(organization.id, comm.id);
  // Send after the response so the page doesn't hang on a large list. If the
  // server stops mid-way, /api/cron/dispatch picks up the rest.
  after(() => dispatchCommunication(organization.id, comm.id).catch((e) => console.error("[messaging] dispatch failed", e)));

  revalidatePath("/messages");
  redirect(`/messages/${comm.id}`);
}

/** Recipient count for the compose form preview. */
export async function countAudience(channel: "EMAIL" | "SMS", groupId: string | null): Promise<number> {
  const { db } = await requireTenant();
  if (channel !== "EMAIL" && channel !== "SMS") return 0;
  return (await resolveRecipients(db, channel, groupId || null)).length;
}
