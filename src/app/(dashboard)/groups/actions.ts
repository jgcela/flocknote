"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkbox, isUniqueViolation, optionalId, optionalText, requiredText, zodErrors, type FormState } from "@/lib/form-state";
import { requireTenant } from "@/lib/tenant";

const groupSchema = z.object({
  name: requiredText("a group name"),
  description: optionalText(1000),
  type: z.enum(["MINISTRY", "SMALL_GROUP", "CLASS", "COMMITTEE", "VOLUNTEER_TEAM", "OTHER"]),
  isPublic: checkbox,
  parentGroupId: optionalId,
});

export async function saveGroup(groupId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { db, organization } = await requireTenant();
  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = parsed.data;

  if (data.parentGroupId) {
    // Walk up from the chosen parent; reaching this group would create a loop.
    let cursor: string | null = data.parentGroupId;
    for (let depth = 0; cursor; depth++) {
      if (cursor === groupId || depth > 20) {
        return { message: "Please fix the highlighted fields.", errors: { parentGroupId: "A group can't sit inside itself or one of its own sub-groups." } };
      }
      const parent: { parentGroupId: string | null } | null = await db.group.findUnique({ where: { id: cursor }, select: { parentGroupId: true } });
      if (!parent) return { message: "The selected parent group no longer exists." };
      cursor = parent.parentGroupId;
    }
  }

  let id = groupId;
  try {
    if (groupId) await db.group.update({ where: { id: groupId }, data });
    else id = (await db.group.create({ data: { ...data, organizationId: organization.id } })).id;
  } catch (e) {
    if (isUniqueViolation(e)) return { message: "Please fix the highlighted fields.", errors: { name: "Another group already has this name." } };
    throw e;
  }

  revalidatePath("/groups", "layout");
  redirect(`/groups/${id}`);
}

export async function setGroupArchived(groupId: string, archived: boolean): Promise<FormState> {
  const { db } = await requireTenant();
  await db.group.update({ where: { id: groupId }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/groups", "layout");
  redirect(archived ? "/groups" : `/groups/${groupId}`);
}

const subscriberSchema = z.object({
  memberId: z.string({ required_error: "Choose a person to add." }).min(1, "Choose a person to add."),
  role: z.enum(["MEMBER", "LEADER", "ADMIN"]),
  emailEnabled: checkbox,
  smsEnabled: checkbox,
});

export async function addSubscriber(groupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { db, organization } = await requireTenant();
  const parsed = subscriberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { memberId, ...prefs } = parsed.data;

  const [group, member] = await Promise.all([
    db.group.findUnique({ where: { id: groupId }, select: { id: true } }),
    db.member.findUnique({ where: { id: memberId }, select: { id: true } }),
  ]);
  if (!group || !member) return { message: "That group or person no longer exists." };

  await db.groupMembership.upsert({
    where: { groupId_memberId: { groupId, memberId } },
    create: { organizationId: organization.id, groupId, memberId, ...prefs },
    update: { ...prefs, unsubscribedAt: null, subscribedAt: new Date() },
  });
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return {};
}

/** Keeps the row (with unsubscribedAt) so the subscription history is preserved. */
export async function removeSubscriber(groupId: string, membershipId: string): Promise<FormState> {
  const { db } = await requireTenant();
  await db.groupMembership.updateMany({ where: { id: membershipId, groupId }, data: { unsubscribedAt: new Date() } });
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return {};
}
