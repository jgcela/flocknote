"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { zodErrors, type FormState } from "@/lib/form-state";
import { sendTransactionalEmail } from "@/lib/messaging";
import { hashPassword, newPasswordSchema } from "@/lib/passwords";
import { checkThrottle, clearLoginAttemptsForEmail, recordAttempt, resetRequestRules } from "@/lib/rate-limit";
import { appUrl, clientIp } from "@/lib/request-meta";
import { PRODUCT_NAME } from "@/lib/brand";
import { findValidInvitation, findValidResetToken } from "@/lib/account-tokens";
import { generateToken } from "@/lib/tokens";

const RESET_TTL_MS = 60 * 60 * 1000;

const GENERIC_RESET_NOTICE =
  "If that email belongs to an account, we've sent a link to reset the password. It works for one hour. Check your spam folder if it doesn't arrive.";

const forgotSchema = z.object({
  email: z.string({ required_error: "Please enter your email address." }).trim().toLowerCase().email("Please enter a valid email address."),
});

/** Always answers the same way, so it can't be used to discover accounts. */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { email } = parsed.data;
  const ip = clientIp(await headers());

  const throttle = await checkThrottle(resetRequestRules(email, ip));
  if (!throttle.allowed) return { notice: GENERIC_RESET_NOTICE };
  await recordAttempt(resetRequestRules(email, ip).map((r) => r.key));

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, disabledAt: true } });
  if (!user || user.disabledAt) return { notice: GENERIC_RESET_NOTICE };

  const { token, tokenHash } = generateToken();
  await prisma.$transaction([
    // Only the newest link works.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);

  const link = appUrl(`reset-password/${token}`);
  await sendTransactionalEmail({
    to: email,
    subject: `Reset your ${PRODUCT_NAME} password`,
    text: [
      `Hello ${user.name},`,
      "",
      `Someone asked to reset the password for your ${PRODUCT_NAME} account. To choose a new password, open this link within one hour:`,
      "",
      link,
      "",
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ].join("\n"),
  });

  return { notice: GENERIC_RESET_NOTICE };
}

const resetSchema = z
  .object({ password: newPasswordSchema, confirm: z.string().optional() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match." });

export async function resetPassword(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);

  const row = await findValidResetToken(token);
  if (!row) return { message: "This reset link has expired or was already used. Please request a new one." };

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();
  const claimed = await prisma.$transaction(async (tx) => {
    // Claim the token atomically so it can't be used twice in parallel.
    const { count } = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
    if (count === 0) return false;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash, passwordChangedAt: now } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });
    return true;
  });
  if (!claimed) return { message: "This reset link was already used. Please request a new one." };

  await clearLoginAttemptsForEmail(row.user.email);
  redirect("/login?reset=1");
}

const acceptSchema = z
  .object({
    name: z.string({ required_error: "Please enter your name." }).trim().min(1, "Please enter your name.").max(120),
    password: newPasswordSchema,
    confirm: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match." });

export async function acceptInvitation(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);

  const invite = await findValidInvitation(token);
  if (!invite) return { message: "This invitation has expired or was cancelled. Ask your church administrator to send a new one." };

  if (await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } })) {
    return { message: "An account with this email already exists. Sign in instead, or ask your administrator to invite a different address." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const ok = await prisma.$transaction(async (tx) => {
    const { count } = await tx.userInvitation.updateMany({
      where: { id: invite.id, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (count === 0) return false;
    await tx.user.create({
      data: { organizationId: invite.organizationId, email: invite.email, name: parsed.data.name, role: invite.role, passwordHash },
    });
    return true;
  });
  if (!ok) return { message: "This invitation was already used." };

  redirect("/login?invited=1");
}
