import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/form-state";
import { requireTenant } from "@/lib/tenant";
import { saveContribution } from "../actions";
import { ContributionForm } from "../giving-forms";
import { contributionOptions } from "../options";

export const metadata: Metadata = { title: "Record a gift" };

export default async function NewContributionPage() {
  const { db } = await requireTenant();
  const options = await contributionOptions(db);
  if (options.funds.length === 0) {
    return (
      <>
        <PageHeader title="Record a gift" />
        <EmptyState title="Create a fund first">
          <Link href="/giving/funds/new" className="font-semibold text-clay-700 underline">Add a fund</Link> to start recording gifts.
        </EmptyState>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Record a gift" description="Enter cash, checks and other gifts received in person or by mail." />
      <ContributionForm
        action={saveContribution.bind(null, null)}
        isNew
        submitLabel="Save gift"
        {...options}
        values={{
          memberId: null,
          householdId: null,
          fundId: options.funds[0]!.value,
          amount: "",
          receivedOn: toDateInput(new Date()),
          taxYear: "",
          method: "CHECK",
          checkNumber: null,
          reference: null,
          note: null,
        }}
      />
    </>
  );
}
