import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { saveHousehold } from "../actions";
import { HouseholdForm } from "../household-form";

export const metadata: Metadata = { title: "Add a household" };

export default function NewHouseholdPage() {
  return (
    <>
      <PageHeader title="Add a household" description="A household groups people who live together." />
      <HouseholdForm
        action={saveHousehold.bind(null, null)}
        submitLabel="Add household"
        residents={null}
        values={{ name: "", addressLine1: null, addressLine2: null, city: null, region: null, postalCode: null, country: null, homePhone: null, primaryContactId: null }}
      />
    </>
  );
}
