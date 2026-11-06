import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireTenant } from "@/lib/tenant";
import { saveMember } from "../actions";
import { MemberForm } from "../member-form";
import { memberFormOptions } from "../options";

export const metadata: Metadata = { title: "Add a person" };

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  const { db } = await requireTenant();
  const { household } = await searchParams;
  const options = await memberFormOptions(db);
  const householdId = options.households.some((h) => h.value === household) ? household! : null;

  return (
    <>
      <PageHeader title="Add a person" description="Only the name is required. You can fill in the rest later." />
      <MemberForm
        action={saveMember.bind(null, null)}
        submitLabel="Add person"
        {...options}
        values={{
          firstName: "",
          lastName: "",
          preferredName: null,
          email: null,
          phone: null,
          birthDate: "",
          status: "ACTIVE",
          emailOptIn: true,
          smsOptIn: false,
          preferredChannel: "EMAIL",
          householdId,
          householdRole: null,
          parent1Id: null,
          parent2Id: null,
          customAttributes: {},
        }}
      />
    </>
  );
}
