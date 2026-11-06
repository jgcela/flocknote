import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireTenant } from "@/lib/tenant";
import { saveFund } from "../../actions";
import { FundForm } from "../../giving-forms";

export const metadata: Metadata = { title: "New fund" };

export default async function NewFundPage() {
  await requireTenant();
  return (
    <>
      <PageHeader title="New fund" description="A fund is where gifts are designated: general offering, building campaign, missions…" />
      <FundForm
        action={saveFund.bind(null, null)}
        submitLabel="Create fund"
        values={{ name: "", description: null, type: "GENERAL", isTaxDeductible: true, isActive: true, goal: "", startsOn: "", endsOn: "" }}
      />
    </>
  );
}
