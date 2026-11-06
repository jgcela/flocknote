"use client";

import { ActionForm, CheckboxField, SelectField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

export function AddSubscriberForm({
  action,
  people,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  people: { value: string; label: string }[];
}) {
  if (people.length === 0) return <p className="text-bark-700">Everyone in your directory is already in this group.</p>;
  return (
    <ActionForm action={action} submitLabel="Add to group" pendingLabel="Adding…" resetOnSuccess className="space-y-5">
      {({ errors = {} }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField name="memberId" label="Person" options={people} emptyLabel="Choose a person…" error={errors.memberId} />
            <SelectField
              name="role"
              label="Role in group"
              options={[
                { value: "MEMBER", label: "Member" },
                { value: "LEADER", label: "Leader" },
                { value: "ADMIN", label: "Group admin" },
              ]}
              defaultValue="MEMBER"
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <CheckboxField name="emailEnabled" label="Gets this group's emails" defaultChecked />
            <CheckboxField name="smsEnabled" label="Gets this group's texts" />
          </div>
        </>
      )}
    </ActionForm>
  );
}
