"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PRODUCT_NAME } from "@/lib/brand";
import { optionalText, zodErrors, type FormState } from "@/lib/form-state";
import { sendTransactionalEmail } from "@/lib/messaging";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/request-meta";
import { requireTeamManager } from "@/lib/tenant";
import { generateToken } from "@/lib/tokens";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const inviteSchema = z.object({
  email: z.string({ required_error: "Please enter an email address." }).trim().toLowerCase().email("Please enter a valid email address."),
  name: optionalText(120),
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function inviteUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, organization } = await requireTeamManager();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { email, name, role } = parsed.data;

  // Logins are global (one email = one church), so check across all churches.
  const existing = await prisma.user.findUnique({ where: { email }, select: { organizationId: true } });
  if (existing) {
    const msg = existing.organizationId === organization.id ? "This person is already on your team." : "This email already has an account with another church.";
    return { message: "Please fix the highlighted fields.", errors: { email: msg } };
  }

  const { token, tokenHash } = generateToken();
  await db.$transaction([
    // A new invitation replaces any pending one for the same address.
    db.userInvitation.updateMany({ where: { email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.userInvitation.create({
      data: { organizationId: organization.id, email, name, role, tokenHash, invitedById: user.id, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    }),
  ]);

  const link = appUrl(`invite/${token}`);
  const sent = await sendTransactionalEmail({
    to: email,
    subject: `${user.name} invited you to ${organization.name} on ${PRODUCT_NAME}`,
    text: [
      name ? `Hello ${name},` : "Hello,",
      "",
      `${user.name} has invited you to help manage ${organization.name} on ${PRODUCT_NAME}.`,
      "To accept, open this link and choose a password. It works for 7 days:",
      "",
      link,
      "",
      "If you weren't expecting this, you can ignore this email.",
    ].join("\n"),
  });

  revalidatePath("/settings/team");
  return {
    notice: sent.ok
      ? `Invitation sent to ${email}. You can also share this link with them directly: ${link}`
      : `We couldn't email ${email}, but the invitation was created. Share this link with them: ${link}`,
  };
}

export async function revokeInvitation(invitationId: string): Promise<FormState> {
  const { db } = await requireTeamManager();
  await db.userInvitation.updateMany({ where: { id: invitationId, acceptedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/settings/team");
  return {};
}

/** Guards shared by role changes and access removal. */
async function loadTarget(userId: string) {
  const ctx = await requireTeamManager();
  if (userId === ctx.user.id) return { ctx, error: "You can't change your own access." };
  const target = await ctx.db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) return { ctx, error: "That person is no longer on your team." };
  if (target.role === "OWNER") return { ctx, error: "The church owner's access can't be changed here." };
  return { ctx, target };
}

export async function changeRole(userId: string, role: "ADMIN" | "STAFF"): Promise<FormState> {
  if (role !== "ADMIN" && role !== "STAFF") return { message: "Unknown role." };
  const { ctx, error } = await loadTarget(userId);
  if (error) return { message: error };
  await ctx.db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings/team");
  return {};
}

export async function setAccess(userId: string, enabled: boolean): Promise<FormState> {
  const { ctx, error } = await loadTarget(userId);
  if (error) return { message: error };
  await ctx.db.user.update({ where: { id: userId }, data: { disabledAt: enabled ? null : new Date() } });
  revalidatePath("/settings/team");
  return {};
}
