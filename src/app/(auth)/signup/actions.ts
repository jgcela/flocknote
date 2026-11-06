"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { checkThrottle, recordAttempt, signupRules } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";

const schema = z.object({
  churchName: z.string().trim().min(2, "Please enter your church's name.").max(120),
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters for your password.").max(200),
});

export type SignupState = { error?: string };

export async function createChurch(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { churchName, name, email, password } = parsed.data;

  const rules = signupRules(clientIp(await headers()));
  if (!(await checkThrottle(rules)).allowed) return { error: "Too many sign-ups from this network. Please try again in an hour." };
  await recordAttempt(rules.map((r) => r.key));

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "An account with that email already exists. Try signing in instead." };
  }

  const base = slugify(churchName) || "church";
  let slug = base;
  for (let i = 2; await prisma.organization.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: churchName, slug } });
    await tx.user.create({ data: { organizationId: org.id, name, email, passwordHash, role: "OWNER" } });
    await tx.fund.create({ data: { organizationId: org.id, name: "General Fund", type: "GENERAL" } });
  });

  redirect("/login?registered=1");
}
