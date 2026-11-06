import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/form-state";
import { centsToInput } from "@/lib/giving";
import { requireTenant } from "@/lib/tenant";
import { saveFund } from "../../actions";
import { FundForm } from "../../giving-forms";

export const metadata: Metadata = { title: "Edit fund" };

export default async function EditFundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const f = await db.fund.findUnique({ where: { id } });
  if (!f) notFound();
  return (
    <>
      <PageHeader title={f.name} description="Funds with gifts can't be deleted; mark them inactive instead." />
      <FundForm
        action={saveFund.bind(null, f.id)}
        submitLabel="Save changes"
        values={{
          name: f.name,
          description: f.description,
          type: f.type,
          isTaxDeductible: f.isTaxDeductible,
          isActive: f.isActive,
          goal: f.goalCents ? centsToInput(f.goalCents) : "",
          startsOn: toDateInput(f.startsOn),
          endsOn: toDateInput(f.endsOn),
        }}
      />
    </>
  );
}
