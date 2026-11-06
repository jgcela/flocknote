import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/form-state";
import { formatMoney } from "@/lib/format";
import { centsToInput } from "@/lib/giving";
import { requireTenant } from "@/lib/tenant";
import { deleteContribution, saveContribution } from "../../actions";
import { ContributionForm } from "../../giving-forms";
import { contributionOptions } from "../../options";

export const metadata: Metadata = { title: "Edit gift" };

export default async function EditContributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const c = await db.contribution.findUnique({ where: { id } });
  if (!c) notFound();
  const options = await contributionOptions(db, c.fundId);
  return (
    <>
      <PageHeader
        title={`Gift of ${formatMoney(c.amountCents, c.currency)}`}
        description="Fix a mistake in a recorded gift."
        actions={<ConfirmButton action={deleteContribution.bind(null, c.id)} label="Delete gift" confirmText="Delete this gift? It will disappear from statements." />}
      />
      <ContributionForm
        action={saveContribution.bind(null, c.id)}
        isNew={false}
        submitLabel="Save changes"
        {...options}
        values={{
          memberId: c.memberId,
          householdId: c.householdId,
          fundId: c.fundId,
          amount: centsToInput(c.amountCents),
          receivedOn: toDateInput(c.receivedOn),
          taxYear: String(c.taxYear),
          method: c.method,
          checkNumber: c.checkNumber,
          reference: c.reference,
          note: c.note,
        }}
      />
    </>
  );
}
