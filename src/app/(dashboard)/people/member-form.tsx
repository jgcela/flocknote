"use client";

import Link from "next/link";
import type { CustomFieldType } from "@prisma/client";
import { ActionForm, CheckboxField, Fieldset, SelectField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

export type MemberFormValues = {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string;
  status: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
  preferredChannel: string;
  householdId: string | null;
  householdRole: string | null;
  parent1Id: string | null;
  parent2Id: string | null;
  customAttributes: Record<string, unknown>;
};

type Option = { value: string; label: string };

const STATUS: Option[] = [
  { value: "ACTIVE", label: "Active member" },
  { value: "VISITOR", label: "Visitor" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DECEASED", label: "Deceased" },
];
const CHANNEL: Option[] = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "Text message" },
  { value: "BOTH", label: "Email and text" },
  { value: "NONE", label: "Don't contact" },
];
const ROLES: Option[] = [
  { value: "HEAD", label: "Head of household" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "CHILD", label: "Child" },
  { value: "OTHER_ADULT", label: "Other adult" },
  { value: "OTHER", label: "Other" },
];

export function MemberForm({
  action,
  values,
  households,
  people,
  customFields,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: MemberFormValues;
  households: Option[];
  people: Option[];
  customFields: { key: string; label: string; type: CustomFieldType; options: string[] }[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} secondary={<Link href="/people" className="btn-secondary no-underline">Cancel</Link>}>
      {({ errors = {} }) => (
        <>
          <Fieldset legend="Name">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="firstName" label="First name" required defaultValue={values.firstName} error={errors.firstName} autoComplete="off" />
              <TextField name="lastName" label="Last name" required defaultValue={values.lastName} error={errors.lastName} autoComplete="off" />
            </div>
            <TextField name="preferredName" label="Goes by" hint="For example “Bill” for William." defaultValue={values.preferredName} error={errors.preferredName} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="birthDate" label="Birthday" type="date" defaultValue={values.birthDate} error={errors.birthDate} />
              <SelectField name="status" label="Status" options={STATUS} defaultValue={values.status} error={errors.status} />
            </div>
          </Fieldset>

          <Fieldset legend="Contact & messages">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="email" label="Email" type="email" defaultValue={values.email} error={errors.email} autoComplete="off" />
              <TextField name="phone" label="Mobile phone" type="tel" hint="Include the country code, e.g. +1 555 123 4567." defaultValue={values.phone} error={errors.phone} autoComplete="off" />
            </div>
            <CheckboxField name="emailOptIn" label="Receives email" defaultChecked={values.emailOptIn} />
            <CheckboxField name="smsOptIn" label="Receives text messages" hint="Only tick this if the person agreed to receive texts." defaultChecked={values.smsOptIn} />
            <SelectField name="preferredChannel" label="Prefers to be contacted by" options={CHANNEL} defaultValue={values.preferredChannel} error={errors.preferredChannel} />
          </Fieldset>

          <Fieldset legend="Family">
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField name="householdId" label="Household" options={households} emptyLabel="Not in a household" defaultValue={values.householdId} error={errors.householdId} />
              <SelectField name="householdRole" label="Role in household" options={ROLES} emptyLabel="—" defaultValue={values.householdRole} error={errors.householdRole} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField name="parent1Id" label="Parent or guardian" hint="Listed first on check-in and pickup." options={people} emptyLabel="None" defaultValue={values.parent1Id} error={errors.parent1Id} />
              <SelectField name="parent2Id" label="Second parent or guardian" options={people} emptyLabel="None" defaultValue={values.parent2Id} error={errors.parent2Id} />
            </div>
          </Fieldset>

          {customFields.length > 0 ? (
            <Fieldset legend="More details">
              <div className="grid gap-5 sm:grid-cols-2">
                {customFields.map((f) => {
                  const name = `custom.${f.key}`;
                  const current = values.customAttributes[f.key];
                  if (f.type === "BOOLEAN") return <CheckboxField key={f.key} name={name} label={f.label} defaultChecked={current === true} />;
                  if (f.type === "SELECT")
                    return <SelectField key={f.key} name={name} label={f.label} emptyLabel="—" options={f.options.map((o) => ({ value: o, label: o }))} defaultValue={typeof current === "string" ? current : ""} />;
                  return (
                    <TextField
                      key={f.key}
                      name={name}
                      label={f.label}
                      type={f.type === "DATE" ? "date" : f.type === "NUMBER" ? "number" : "text"}
                      defaultValue={current == null ? "" : String(current)}
                    />
                  );
                })}
              </div>
            </Fieldset>
          ) : null}
        </>
      )}
    </ActionForm>
  );
}
