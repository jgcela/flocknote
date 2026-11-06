import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "../account-actions";
import { ForgotPasswordForm } from "../account-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Forgot your password?</h1>
      <p className="mb-6 text-bark-700">Enter the email you sign in with and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm action={requestPasswordReset} />
      <p className="mt-6 text-center text-bark-700">
        <Link href="/login" className="font-semibold text-clay-700 underline">Back to sign in</Link>
      </p>
    </>
  );
}
