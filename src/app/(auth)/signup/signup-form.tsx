"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createChurch, type SignupState } from "./actions";

const FIELDS = [
  { name: "churchName", label: "Church name", type: "text", autoComplete: "organization" },
  { name: "name", label: "Your name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email address", type: "email", autoComplete: "email" },
  { name: "password", label: "Choose a password", type: "password", autoComplete: "new-password", hint: "At least 10 characters." },
];

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(createChurch, {});

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Set up your church</h1>
      <p className="mb-6 text-bark-700">You&apos;ll be the administrator. You can invite staff later.</p>
      <form action={action} className="space-y-5">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="field-label">{f.label}</label>
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              required
              aria-describedby={f.hint ? `${f.name}-hint` : undefined}
              className="field-input"
            />
            {f.hint ? <p id={`${f.name}-hint`} className="mt-1 text-sm text-bark-700">{f.hint}</p> : null}
          </div>
        ))}
        {state.error ? (
          <p role="alert" className="rounded-xl bg-clay-50 px-4 py-3 text-clay-700">{state.error}</p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Creating…" : "Create my church"}
        </button>
      </form>
      <p className="mt-6 text-center text-bark-700">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-clay-700 underline">Sign in</Link>
      </p>
    </>
  );
}
