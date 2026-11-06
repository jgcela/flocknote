"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginErrorMessage } from "@/lib/auth-messages";

function safeCallback(url?: string) {
  // Only follow same-origin URLs, to prevent open redirects.
  if (!url) return "/dashboard";
  try {
    const target = new URL(url, window.location.origin);
    if (target.origin === window.location.origin) return target.pathname + target.search;
  } catch {
    // fall through
  }
  return "/dashboard";
}

const NOTICES = {
  registered: "Your church is set up. Please sign in.",
  invited: "Your account is ready. Please sign in.",
  reset: "Your password has been changed. Please sign in with the new one.",
  expired: "Your password was changed, so please sign in again.",
} as const;

export type LoginNotice = keyof typeof NOTICES;

export function LoginForm({ notice, callbackUrl }: { notice?: LoginNotice; callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setPending(false);
    if (!result || result.error) {
      setError(loginErrorMessage(result?.error ?? ""));
      return;
    }
    router.push(safeCallback(callbackUrl));
    router.refresh();
  }

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Welcome back</h1>
      {notice ? (
        <p role="status" className="mb-5 rounded-xl bg-meadow-50 px-4 py-3 text-meadow-700">
          {NOTICES[notice]}
        </p>
      ) : null}
      <form onSubmit={onSubmit} method="post" className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="field-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field-input" />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="field-label">Password</label>
            <Link href="/forgot-password" className="font-semibold text-clay-700 underline">Forgot password?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" />
        </div>
        {error ? (
          <p role="alert" className="rounded-xl bg-clay-50 px-4 py-3 text-clay-700">{error}</p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-bark-700">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-clay-700 underline">Set up your church</Link>
      </p>
    </>
  );
}
