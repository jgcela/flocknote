"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, isUniqueViolation, optionalDate, optionalId, optionalText, requiredText, zodErrors, type FormState } from "@/lib/form-state";
import { formatMoney } from "@/lib/format";
import { buildStatements, moneyField, statementText, type DonorKey } from "@/lib/giving";
import { getEmailProvider, type SendResult } from "@/lib/messaging";
import { requireTenant } from "@/lib/tenant";

const METHODS = ["CASH", "CHECK", "CARD", "ACH", "ONLINE", "OTHER"] as const;

const contributionSchema = z
  .object({
    memberId: optionalId,
    householdId: optionalId,
    fundId: z.string({ required_error: "Choose a fund." }).min(1, "Choose a fund."),
    amount: moneyField,
    receivedOn: optionalDate,
    taxYear: z.string().trim().optional(),
    method: z.enum(METHODS),
    checkNumber: optionalText(40),
    reference: optionalText(120),
    note: optionalText(500),
    addAnother: checkbox,
  })
  .transform((v, ctx) => {
    if (!v.receivedOn) {
      ctx.addIssue({ code: "custom", path: ["receivedOn"], message: "Please enter the date the gift was received." });
      return z.NEVER;
    }
    const year = v.taxYear ? Number(v.taxYear) : v.receivedOn.getUTCFullYear();
    if (!Number.isInteger(year) || year < 1990 || year > 2100) {
      ctx.addIssue({ code: "custom", path: ["taxYear"], message: "Enter a year like 2026." });
      return z.NEVER;
    }
    return { ...v, receivedOn: v.receivedOn, taxYear: year };
  });

export async function saveContribution(contributionId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { db, organization } = await requireTenant();
  const parsed = contributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { amount, addAnother, ...v } = parsed.data;

  const [fund, member, household] = await Promise.all([
    db.fund.findUnique({ where: { id: v.fundId }, select: { id: true } }),
    v.memberId ? db.member.findUnique({ where: { id: v.memberId }, select: { id: true, householdId: true } }) : null,
    v.householdId ? db.household.findUnique({ where: { id: v.householdId }, select: { id: true } }) : null,
  ]);
  if (!fund) return { message: "Please fix the highlighted fields.", errors: { fundId: "That fund no longer exists." } };
  if (v.memberId && !member) return { message: "Please fix the highlighted fields.", errors: { memberId: "That person no longer exists." } };
  if (v.householdId && !household) return { message: "Please fix the highlighted fields.", errors: { householdId: "That household no longer exists." } };

  const data = {
    ...v,
    // A person's gift counts toward their household's statement by default.
    householdId: v.householdId ?? member?.householdId ?? null,
    checkNumber: v.method === "CHECK" ? v.checkNumber : null,
    amountCents: amount,
  };

  if (contributionId) {
    await db.contribution.update({ where: { id: contributionId }, data });
  } else {
    await db.contribution.create({ data: { ...data, organizationId: organization.id } });
  }
  revalidatePath("/giving", "layout");
  if (!contributionId && addAnother) {
    return { notice: `Saved a gift of ${formatMoney(amount)}. Enter the next one.` };
  }
  redirect("/giving");
}

export async function deleteContribution(contributionId: string): Promise<FormState> {
  const { db } = await requireTenant();
  await db.contribution.delete({ where: { id: contributionId } });
  revalidatePath("/giving", "layout");
  redirect("/giving");
}

const fundSchema = z.object({
  name: requiredText("a fund name"),
  description: optionalText(500),
  type: z.enum(["GENERAL", "CAMPAIGN", "DESIGNATED"]),
  isTaxDeductible: checkbox,
  isActive: checkbox,
  goal: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.union([z.null(), moneyField])),
  startsOn: optionalDate,
  endsOn: optionalDate,
});

export async function saveFund(fundId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { db, organization } = await requireTenant();
  const parsed = fundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { goal, ...v } = parsed.data;
  if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) {
    return { message: "Please fix the highlighted fields.", errors: { endsOn: "The end date is before the start date." } };
  }
  const data = { ...v, goalCents: goal };
  try {
    if (fundId) await db.fund.update({ where: { id: fundId }, data });
    else await db.fund.create({ data: { ...data, organizationId: organization.id } });
  } catch (e) {
    if (isUniqueViolation(e)) return { message: "Please fix the highlighted fields.", errors: { name: "Another fund already has this name." } };
    throw e;
  }
  revalidatePath("/giving", "layout");
  redirect("/giving");
}

/**
 * Email annual statements. Logged as one Communication so the delivery log
 * and webhooks work as for any other email. Statements go out whatever the
 * person's newsletter opt-in, because they are a tax record, not a broadcast.
 */
export async function emailStatements(year: number, only: DonorKey | null): Promise<FormState> {
  const { db, user, organization } = await requireTenant();
  const org = await db.organization.findUniqueOrThrow({ where: { id: organization.id } });
  const statements = (await buildStatements(db, year, only ?? undefined)).filter((s) => s.email);
  if (statements.length === 0) return { message: "Nobody in this list has an email address on file." };

  const subject = `Your ${year} giving statement from ${org.name}`;
  const comm = await db.communication.create({
    data: {
      organizationId: organization.id,
      channel: "EMAIL",
      status: "SENDING",
      subject,
      body: `Annual giving statements for ${year} (each person receives their own totals).`,
      sentById: user.id,
    },
  });

  const provider = getEmailProvider();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < statements.length; i += provider.maxBatch) {
    const batch = statements.slice(i, i + provider.maxBatch);
    let results: SendResult[];
    try {
      results = await provider.sendBatch(
        batch.map((s) => ({
          to: s.email!,
          subject,
          fromName: org.name,
          replyTo: org.email ?? undefined,
          text: `Thank you for your generosity in ${year}.\n\n${statementText(s, year, org)}`,
        })),
      );
    } catch (e) {
      results = batch.map(() => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    }
    const rows = batch.map((s, j) => {
      const r: SendResult = results[j] ?? { ok: false, error: "No result" };
      if (r.ok) sent++;
      else failed++;
      return {
        organizationId: organization.id,
        communicationId: comm.id,
        address: s.email!,
        status: r.ok ? ("SENT" as const) : ("FAILED" as const),
        providerMessageId: r.ok ? (r.providerMessageId ?? null) : null,
        errorMessage: r.ok ? null : r.error.slice(0, 500),
      };
    });
    await db.communicationRecipient.createMany({ data: rows, skipDuplicates: true });
  }
  await db.communication.update({
    where: { id: comm.id },
    data: { status: sent ? "SENT" : "FAILED", sentAt: new Date(), recipientCount: sent + failed, deliveredCount: sent, failedCount: failed },
  });
  revalidatePath("/messages");
  return failed
    ? { message: `Sent ${sent} statement(s); ${failed} failed. See Messages for details.` }
    : { notice: `Emailed ${sent} statement${sent === 1 ? "" : "s"}. The delivery log is in Messages.` };
}
