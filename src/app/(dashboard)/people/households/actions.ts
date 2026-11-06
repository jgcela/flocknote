"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { optionalId, optionalPhone, optionalText, requiredText, zodErrors, type FormState } from "@/lib/form-state";
import { requireTenant } from "@/lib/tenant";

const householdSchema = z.object({
  name: requiredText("a household name"),
  addressLine1: optionalText(),
  addressLine2: optionalText(),
  city: optionalText(100),
  region: optionalText(100),
  postalCode: optionalText(20),
  country: optionalText(60),
  homePhone: optionalPhone,
  primaryContactId: optionalId,
});

export async function saveHousehold(householdId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { db, organization } = await requireTenant();
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = parsed.data;

  if (data.primaryContactId) {
    const contact = await db.member.findUnique({ where: { id: data.primaryContactId }, select: { householdId: true } });
    if (!contact || contact.householdId !== householdId) {
      return { message: "Please fix the highlighted fields.", errors: { primaryContactId: "The primary contact must live in this household." } };
    }
  }

  const saved = householdId
    ? await db.household.update({ where: { id: householdId }, data })
    : await db.household.create({ data: { ...data, primaryContactId: null, organizationId: organization.id } });

  revalidatePath("/people", "layout");
  redirect(householdId ? "/people/households" : `/people/households/${saved.id}`);
}

export async function deleteHousehold(householdId: string): Promise<FormState> {
  const { db } = await requireTenant();
  await db.$transaction(async (tx) => {
    // People and gifts stay; they are just no longer linked to this household.
    await tx.household.update({ where: { id: householdId }, data: { primaryContactId: null } });
    await tx.member.updateMany({ where: { householdId }, data: { householdId: null, householdRole: null } });
    await tx.contribution.updateMany({ where: { householdId }, data: { householdId: null } });
    await tx.household.delete({ where: { id: householdId } });
  });
  revalidatePath("/people", "layout");
  redirect("/people/households");
}
