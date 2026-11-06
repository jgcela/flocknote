"use client";

import { ActionForm, SelectField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staff — manage people, groups, messages and giving" },
  { value: "ADMIN", label: "Administrator — everything staff can do, plus manage the team" },
];

export function InviteForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  return (
    <ActionForm action={action} submitLabel="Send invitation" pendingLabel="Sending…" resetOnSuccess className="space-y-5">
      {(state) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="email" label="Email address" type="email" required error={state.errors?.email} />
            <TextField name="name" label="Name" error={state.errors?.name} />
          </div>
          <SelectField name="role" label="Role" options={ROLE_OPTIONS} defaultValue="STAFF" error={state.errors?.role} />
        </>
      )}
    </ActionForm>
  );
}
