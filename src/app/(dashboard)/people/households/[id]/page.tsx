import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { displayName, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";
import { deleteHousehold, saveHousehold } from "../actions";
import { HouseholdForm } from "../household-form";

export const metadata: Metadata = { title: "Edit household" };

export default async function EditHouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const household = await db.household.findUnique({
    where: { id },
    include: { members: { orderBy: [{ birthDate: "asc" }], select: { id: true, firstName: true, lastName: true, preferredName: true, householdRole: true } } },
  });
  if (!household) notFound();
  const { members, ...values } = household;

  return (
    <>
      <PageHeader
        title={household.name}
        description="Update the household and who lives in it."
        actions={
          <ConfirmButton
            action={deleteHousehold.bind(null, household.id)}
            label="Delete household"
            confirmText={`Delete ${household.name}? The people in it are kept; they just won't belong to a household.`}
          />
        }
      />

      <section className="card mb-6 p-6" aria-labelledby="residents-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="residents-heading" className="text-xl font-bold">People in this household</h2>
          <Link href={`/people/new?household=${household.id}`} className="btn-secondary no-underline">Add a new person here</Link>
        </div>
        {members.length === 0 ? (
          <p className="text-bark-700">Nobody yet. Add a new person, or open an existing person and choose this household.</p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5">
                <Link href={`/people/${m.id}`} className="font-semibold text-clay-700 underline">{displayName(m)}</Link>
                <span className="text-bark-700">{m.householdRole ? titleCase(m.householdRole) : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HouseholdForm
        action={saveHousehold.bind(null, household.id)}
        submitLabel="Save changes"
        residents={members.map((m) => ({ value: m.id, label: displayName(m) }))}
        values={values}
      />
    </>
  );
}
