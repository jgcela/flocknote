import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/form-state";
import { displayName } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";
import { deleteMember, saveMember } from "../actions";
import { MemberForm } from "../member-form";
import { memberFormOptions } from "../options";

export const metadata: Metadata = { title: "Edit person" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const member = await db.member.findUnique({
    where: { id },
    include: { parentLinks: { orderBy: [{ isPrimaryGuardian: "desc" }, { createdAt: "asc" }], select: { parentId: true } } },
  });
  if (!member) notFound();
  const options = await memberFormOptions(db, member.id);
  const attrs = member.customAttributes;

  return (
    <>
      <PageHeader
        title={displayName(member)}
        description="Update this person's details."
        actions={
          <ConfirmButton
            action={deleteMember.bind(null, member.id)}
            label="Delete person"
            confirmText={`Delete ${displayName(member)}? This can't be undone.`}
          />
        }
      />
      <MemberForm
        action={saveMember.bind(null, member.id)}
        submitLabel="Save changes"
        {...options}
        values={{
          firstName: member.firstName,
          lastName: member.lastName,
          preferredName: member.preferredName,
          email: member.email,
          phone: member.phone,
          birthDate: toDateInput(member.birthDate),
          status: member.status,
          emailOptIn: member.emailOptIn,
          smsOptIn: member.smsOptIn,
          preferredChannel: member.preferredChannel,
          householdId: member.householdId,
          householdRole: member.householdRole,
          parent1Id: member.parentLinks[0]?.parentId ?? null,
          parent2Id: member.parentLinks[1]?.parentId ?? null,
          customAttributes: attrs && typeof attrs === "object" && !Array.isArray(attrs) ? (attrs as Record<string, unknown>) : {},
        }}
      />
    </>
  );
}
