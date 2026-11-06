"use client";

import { ActionForm, Fieldset, TextAreaField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

export type ChurchValues = { name: string; email: string | null; phone: string | null; address: string | null; taxId: string | null; receiptNote: string | null };

export function ChurchForm({ action, values, defaultNote }: { action: (s: FormState, f: FormData) => Promise<FormState>; values: ChurchValues; defaultNote: string }) {
  return (
    <ActionForm action={action} submitLabel="Save church details">
      {({ errors = {} }) => (
        <>
          <Fieldset legend="Contact details">
            <TextField name="name" label="Church name" required defaultValue={values.name} error={errors.name} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="email" label="Office email" type="email" defaultValue={values.email} error={errors.email} hint="Replies to group emails go here." />
              <TextField name="phone" label="Office phone" defaultValue={values.phone} error={errors.phone} />
            </div>
            <TextAreaField name="address" label="Mailing address" defaultValue={values.address} error={errors.address} />
          </Fieldset>
          <Fieldset legend="Giving statements">
            <TextField name="taxId" label="Tax ID (e.g. EIN)" defaultValue={values.taxId} error={errors.taxId} />
            <TextAreaField
              name="receiptNote"
              label="Statement wording"
              defaultValue={values.receiptNote}
              error={errors.receiptNote}
              rows={4}
              hint={`Printed at the bottom of each statement. If left blank: "${defaultNote}" Check the wording your country requires with your accountant.`}
            />
          </Fieldset>
        </>
      )}
    </ActionForm>
  );
}
