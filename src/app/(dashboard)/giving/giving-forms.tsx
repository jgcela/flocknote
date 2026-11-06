"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, CheckboxField, Fieldset, SelectField, TextAreaField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;
type Option = { value: string; label: string };

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "CARD", label: "Card" },
  { value: "ACH", label: "Bank transfer" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

export type ContributionValues = {
  memberId: string | null;
  householdId: string | null;
  fundId: string;
  amount: string;
  receivedOn: string;
  taxYear: string;
  method: string;
  checkNumber: string | null;
  reference: string | null;
  note: string | null;
};

export function ContributionForm({
  action,
  values,
  people,
  households,
  funds,
  submitLabel,
  isNew,
}: {
  action: Action;
  values: ContributionValues;
  people: Option[];
  households: Option[];
  funds: Option[];
  submitLabel: string;
  isNew: boolean;
}) {
  const [method, setMethod] = useState(values.method);
  return (
    <ActionForm
      action={action}
      submitLabel={submitLabel}
      resetOnSuccess={isNew}
      secondary={<Link href="/giving" className="btn-secondary no-underline">Cancel</Link>}
    >
      {({ errors = {} }) => (
        <>
          <Fieldset legend="Gift">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="amount" label="Amount" required defaultValue={values.amount} error={errors.amount} hint="For example 25 or 125.50" />
              <SelectField name="fundId" label="Fund" options={funds} defaultValue={values.fundId} error={errors.fundId} />
              <TextField name="receivedOn" label="Date received" type="date" required defaultValue={values.receivedOn} error={errors.receivedOn} />
              <TextField
                name="taxYear"
                label="Tax year"
                defaultValue={values.taxYear}
                error={errors.taxYear}
                hint="Leave blank to use the year it was received. Use the earlier year for a check dated and mailed by Dec 31."
              />
            </div>
          </Fieldset>
          <Fieldset legend="Who gave it">
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField name="memberId" label="Person" options={people} emptyLabel="Anonymous / not known" defaultValue={values.memberId} error={errors.memberId} />
              <SelectField
                name="householdId"
                label="Household"
                options={households}
                emptyLabel="The person's household"
                defaultValue={values.householdId}
                error={errors.householdId}
                hint="Gifts appear on the household's yearly statement."
              />
            </div>
          </Fieldset>
          <Fieldset legend="Payment">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="method" className="field-label">Method</label>
                <select id="method" name="method" defaultValue={values.method} onChange={(e) => setMethod(e.target.value)} className="field-input">
                  {METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {method === "CHECK" ? <TextField name="checkNumber" label="Check number" defaultValue={values.checkNumber} error={errors.checkNumber} /> : null}
              <TextField name="reference" label="Reference" defaultValue={values.reference} error={errors.reference} hint="Envelope number, bank reference…" />
            </div>
            <TextAreaField name="note" label="Note" defaultValue={values.note} error={errors.note} rows={2} />
            {isNew ? <CheckboxField name="addAnother" label="Stay on this page to enter another gift" defaultChecked /> : null}
          </Fieldset>
        </>
      )}
    </ActionForm>
  );
}

export type FundValues = {
  name: string;
  description: string | null;
  type: string;
  isTaxDeductible: boolean;
  isActive: boolean;
  goal: string;
  startsOn: string;
  endsOn: string;
};

export function FundForm({ action, values, submitLabel }: { action: Action; values: FundValues; submitLabel: string }) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} secondary={<Link href="/giving" className="btn-secondary no-underline">Cancel</Link>}>
      {({ errors = {} }) => (
        <Fieldset legend="Fund details">
          <TextField name="name" label="Fund name" required defaultValue={values.name} error={errors.name} />
          <TextAreaField name="description" label="Description" defaultValue={values.description} error={errors.description} />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="type"
              label="Kind of fund"
              options={[
                { value: "GENERAL", label: "General" },
                { value: "CAMPAIGN", label: "Campaign (with a goal)" },
                { value: "DESIGNATED", label: "Designated (for a specific purpose)" },
              ]}
              defaultValue={values.type}
              error={errors.type}
            />
            <TextField name="goal" label="Goal amount" defaultValue={values.goal} error={errors.goal} />
            <TextField name="startsOn" label="Starts" type="date" defaultValue={values.startsOn} error={errors.startsOn} />
            <TextField name="endsOn" label="Ends" type="date" defaultValue={values.endsOn} error={errors.endsOn} />
          </div>
          <CheckboxField name="isTaxDeductible" label="Tax-deductible" hint="Gifts to this fund appear on yearly statements." defaultChecked={values.isTaxDeductible} />
          <CheckboxField name="isActive" label="Active" hint="Inactive funds are hidden when entering new gifts." defaultChecked={values.isActive} />
        </Fieldset>
      )}
    </ActionForm>
  );
}
