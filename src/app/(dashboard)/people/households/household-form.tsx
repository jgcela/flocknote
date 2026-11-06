"use client";

import Link from "next/link";
import { ActionForm, Fieldset, SelectField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

export type HouseholdFormValues = {
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  homePhone: string | null;
  primaryContactId: string | null;
};

export function HouseholdForm({
  action,
  values,
  residents,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: HouseholdFormValues;
  /** People in this household; null while the household is being created. */
  residents: { value: string; label: string }[] | null;
  submitLabel: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={submitLabel}
      secondary={<Link href="/people/households" className="btn-secondary no-underline">Cancel</Link>}
    >
      {({ errors = {} }) => (
        <>
          <Fieldset legend="Household">
            <TextField name="name" label="Household name" required hint="For example “The Garcia Family”." defaultValue={values.name} error={errors.name} />
            {residents === null ? (
              <p className="text-bark-700">After saving, you can add people and choose the primary contact.</p>
            ) : residents.length === 0 ? (
              <p className="text-bark-700">Add people to this household to choose a primary contact.</p>
            ) : (
              <SelectField
                name="primaryContactId"
                label="Primary contact"
                hint="Receives household mail and giving statements."
                options={residents}
                emptyLabel="Not set"
                defaultValue={values.primaryContactId}
                error={errors.primaryContactId}
              />
            )}
            <TextField name="homePhone" label="Home phone" type="tel" defaultValue={values.homePhone} error={errors.homePhone} />
          </Fieldset>
          <Fieldset legend="Address">
            <TextField name="addressLine1" label="Street address" defaultValue={values.addressLine1} error={errors.addressLine1} autoComplete="off" />
            <TextField name="addressLine2" label="Apartment, suite, etc." defaultValue={values.addressLine2} error={errors.addressLine2} autoComplete="off" />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="city" label="City" defaultValue={values.city} error={errors.city} />
              <TextField name="region" label="State or province" defaultValue={values.region} error={errors.region} />
              <TextField name="postalCode" label="Postal code" defaultValue={values.postalCode} error={errors.postalCode} />
              <TextField name="country" label="Country" defaultValue={values.country} error={errors.country} />
            </div>
          </Fieldset>
        </>
      )}
    </ActionForm>
  );
}
