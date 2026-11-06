"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { optionalEmail, optionalPhone, optionalText, requiredText, zodErrors, type FormState } from "@/lib/form-state";
import { requireTeamManager } from "@/lib/tenant";

const schema = z.object({
  name: requiredText("your church's name"),
  email: optionalEmail,
  phone: optionalPhone,
  address: optionalText(400),
  taxId: optionalText(40),
  receiptNote: optionalText(1000),
});

export async function saveChurch(_prev: FormState, formData: FormData): Promise<FormState> {
  const { organization } = await requireTeamManager();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  // Organization is the tenant itself, so it is updated by its own id.
  await prisma.organization.update({ where: { id: organization.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { notice: "Saved." };
}
