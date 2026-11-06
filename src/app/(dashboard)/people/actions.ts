"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  checkbox,
  isUniqueViolation,
  optionalDate,
  optionalEmail,
  optionalId,
  optionalPhone,
  optionalText,
  requiredText,
  zodErrors,
  type FormState,
} from "@/lib/form-state";
import { requireTenant } from "@/lib/tenant";

const memberSchema = z
  .object({
    firstName: requiredText("a first name"),
    lastName: requiredText("a last name"),
    preferredName: optionalText(80),
    email: optionalEmail,
    phone: optionalPhone,
    birthDate: optionalDate,
    status: z.enum(["ACTIVE", "VISITOR", "INACTIVE", "DECEASED"]),
    emailOptIn: checkbox,
    smsOptIn: checkbox,
    preferredChannel: z.enum(["EMAIL", "SMS", "BOTH", "NONE"]),
    householdId: optionalId,
    householdRole: z
      .enum(["HEAD", "SPOUSE", "CHILD", "OTHER_ADULT", "OTHER", ""])
      .optional()
      .transform((v) => (v ? v : null)),
    parent1Id: optionalId,
    parent2Id: optionalId,
  })
  .superRefine((v, ctx) => {
    if (v.smsOptIn && !v.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "Add a phone number to send text messages." });
    if (v.emailOptIn && !v.email) ctx.addIssue({ code: "custom", path: ["email"], message: "Add an email address, or untick “Receives email”." });
    if (v.parent1Id && v.parent1Id === v.parent2Id) ctx.addIssue({ code: "custom", path: ["parent2Id"], message: "Choose two different people." });
  });

export async function saveMember(memberId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { db, organization } = await requireTenant();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) return zodErrors(parsed.error);
  const { parent1Id, parent2Id, ...data } = parsed.data;

  if (memberId && [parent1Id, parent2Id].includes(memberId)) {
    return { message: "Please fix the highlighted fields.", errors: { parent1Id: "A person can't be their own parent." } };
  }

  // Custom fields: only keys this church has defined are kept.
  const defs = await db.customFieldDefinition.findMany({ select: { key: true, type: true } });
  const customAttributes: Record<string, string | boolean> = {};
  for (const def of defs) {
    const value = raw[`custom.${def.key}`];
    if (def.type === "BOOLEAN") customAttributes[def.key] = value === "on";
    else if (value?.trim()) customAttributes[def.key] = value.trim().slice(0, 500);
  }

  // Referenced records must belong to this church (tenantDb filters by org).
  const refIds = [parent1Id, parent2Id].filter((id): id is string => !!id);
  if (refIds.length && (await db.member.count({ where: { id: { in: refIds } } })) !== refIds.length) {
    return { message: "One of the selected parents no longer exists." };
  }
  if (data.householdId && !(await db.household.findUnique({ where: { id: data.householdId }, select: { id: true } }))) {
    return { message: "The selected household no longer exists." };
  }

  const memberData = {
    ...data,
    householdRole: data.householdId ? data.householdRole : null,
    unsubscribedAt: !data.emailOptIn && !data.smsOptIn ? new Date() : null,
    customAttributes,
  };

  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      const member = memberId
        ? await tx.member.update({ where: { id: memberId }, data: memberData })
        : await tx.member.create({ data: { ...memberData, organizationId: organization.id } });

      await tx.parentalRelationship.deleteMany({ where: { childId: member.id, parentId: { notIn: refIds } } });
      for (const [index, parentId] of refIds.entries()) {
        await tx.parentalRelationship.upsert({
          where: { parentId_childId: { parentId, childId: member.id } },
          create: { organizationId: organization.id, parentId, childId: member.id, isPrimaryGuardian: index === 0 },
          update: { isPrimaryGuardian: index === 0 },
        });
      }
      return member.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { message: "Please fix the highlighted fields.", errors: { email: "Someone in your church already uses this email." } };
    }
    throw e;
  }

  revalidatePath("/people", "layout");
  redirect(`/people?saved=${id}`);
}

export async function deleteMember(memberId: string): Promise<FormState> {
  const { db } = await requireTenant();
  const member = await db.member.findUnique({ where: { id: memberId }, select: { id: true, _count: { select: { contributions: true } } } });
  if (!member) return { message: "This person was already removed." };
  if (member._count.contributions > 0) {
    return { message: "This person has giving records, so they can't be deleted. Set their status to Inactive instead." };
  }

  await db.$transaction(async (tx) => {
    await tx.household.updateMany({ where: { primaryContactId: memberId }, data: { primaryContactId: null } });
    await tx.communicationRecipient.updateMany({ where: { memberId }, data: { memberId: null } });
    await tx.member.delete({ where: { id: memberId } });
  });

  revalidatePath("/people", "layout");
  redirect("/people");
}
