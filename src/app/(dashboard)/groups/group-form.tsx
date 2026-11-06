"use client";

import Link from "next/link";
import { ActionForm, CheckboxField, Fieldset, SelectField, TextAreaField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

export const GROUP_TYPES = [
  { value: "MINISTRY", label: "Ministry" },
  { value: "SMALL_GROUP", label: "Small group" },
  { value: "CLASS", label: "Class" },
  { value: "COMMITTEE", label: "Committee" },
  { value: "VOLUNTEER_TEAM", label: "Volunteer team" },
  { value: "OTHER", label: "Other" },
];

export type GroupFormValues = {
  name: string;
  description: string | null;
  type: string;
  isPublic: boolean;
  parentGroupId: string | null;
};

export function GroupForm({
  action,
  values,
  parentOptions,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: GroupFormValues;
  parentOptions: { value: string; label: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} secondary={<Link href={cancelHref} className="btn-secondary no-underline">Cancel</Link>}>
      {({ errors = {} }) => (
        <Fieldset legend="Group details">
          <TextField name="name" label="Group name" required defaultValue={values.name} error={errors.name} />
          <TextAreaField name="description" label="Description" hint="Shown to people deciding whether to join." defaultValue={values.description} error={errors.description} />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField name="type" label="Kind of group" options={GROUP_TYPES} defaultValue={values.type} error={errors.type} />
            <SelectField name="parentGroupId" label="Part of another group" options={parentOptions} emptyLabel="No, this is a top-level group" defaultValue={values.parentGroupId} error={errors.parentGroupId} />
          </div>
          <CheckboxField name="isPublic" label="Anyone can join" hint="Untick to make this group invite-only." defaultChecked={values.isPublic} />
        </Fieldset>
      )}
    </ActionForm>
  );
}
