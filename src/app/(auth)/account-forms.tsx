"use client";

import { ActionForm, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ForgotPasswordForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} submitLabel="Send reset link" pendingLabel="Sending…" className="space-y-5">
      {(state) => <TextField name="email" label="Email address" type="email" autoComplete="email" required error={state.errors?.email} />}
    </ActionForm>
  );
}

export function NewPasswordForm({
  action,
  submitLabel,
  minLength,
  askName,
  defaultName,
}: {
  action: Action;
  submitLabel: string;
  minLength: number;
  askName?: boolean;
  defaultName?: string | null;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="space-y-5">
      {(state) => (
        <>
          {askName ? <TextField name="name" label="Your name" autoComplete="name" required defaultValue={defaultName} error={state.errors?.name} /> : null}
          <TextField
            name="password"
            label={askName ? "Choose a password" : "New password"}
            type="password"
            autoComplete="new-password"
            required
            hint={`At least ${minLength} characters.`}
            error={state.errors?.password}
          />
          <TextField name="confirm" label="Type it again" type="password" autoComplete="new-password" required error={state.errors?.confirm} />
        </>
      )}
    </ActionForm>
  );
}
