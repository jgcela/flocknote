"use client";

import { useActionState, useEffect, useRef, useTransition, type ReactNode } from "react";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Form wrapper for server actions. Submits via a transition instead of the
 * `action` prop so React does not reset the fields when validation fails —
 * people never lose what they typed.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  secondary,
  className = "space-y-6",
  resetOnSuccess = false,
}: {
  action: Action;
  children: (state: FormState) => ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  secondary?: ReactNode;
  className?: string;
  /** Clear the fields after a successful save (for "add another" forms). */
  resetOnSuccess?: boolean;
}) {
  const [state, dispatch] = useActionState<FormState, FormData>(action, {});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (resetOnSuccess && submitted.current && !state.message && !state.errors) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      noValidate
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        submitted.current = true;
        startTransition(() => dispatch(data));
      }}
    >
      {state.message ? (
        <p role="alert" className="rounded-xl bg-clay-50 px-4 py-3 font-semibold text-clay-700">
          {state.message}
        </p>
      ) : null}
      {children(state)}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {secondary}
      </div>
    </form>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="mt-1 text-bark-700">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="mt-1 font-semibold text-clay-700">{error}</p> : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({
  name,
  label,
  defaultValue,
  error,
  hint,
  type = "text",
  required,
  autoComplete,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <Field id={name} label={required ? label : `${label} (optional)`} error={error} hint={hint} className={className}>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`field-input ${error ? "border-clay-600" : ""}`}
      />
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
  error,
  hint,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <Field id={name} label={`${label} (optional)`} error={error} hint={hint}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`field-input ${error ? "border-clay-600" : ""}`}
      />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
  error,
  hint,
  emptyLabel,
  className,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  error?: string;
  hint?: string;
  /** When set, adds a first "none" option with value "". */
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <Field id={name} label={label} error={error} hint={hint} className={className}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`field-input ${error ? "border-clay-600" : ""}`}
      >
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="mt-1 h-6 w-6 shrink-0 rounded border-2 border-bark-500 accent-clay-600"
      />
      <div>
        <label htmlFor={name} className="font-semibold">{label}</label>
        {hint ? <p id={`${name}-hint`} className="text-bark-700">{hint}</p> : null}
      </div>
    </div>
  );
}

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="card space-y-5 p-6">
      <legend className="float-left mb-1 w-full font-display text-xl font-bold">{legend}</legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}

/** Button that runs a server action after the user confirms. */
export function ConfirmButton({
  action,
  label,
  confirmText,
  className = "btn-secondary",
}: {
  action: () => Promise<FormState | void>;
  label: string;
  confirmText: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [state, dispatch] = useActionState<FormState, void>(async () => (await action()) ?? {}, {});
  return (
    <span className="inline-flex flex-col gap-2">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (window.confirm(confirmText)) startTransition(() => dispatch());
        }}
      >
        {pending ? "Working…" : label}
      </button>
      {state.message ? <span role="alert" className="font-semibold text-clay-700">{state.message}</span> : null}
    </span>
  );
}
