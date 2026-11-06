import type { Metadata } from "next";
import Link from "next/link";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { findValidResetToken } from "@/lib/account-tokens";
import { resetPassword } from "../../account-actions";
import { NewPasswordForm } from "../../account-forms";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await findValidResetToken(token);

  if (!valid) {
    return (
      <>
        <h1 className="mb-2 text-3xl font-bold">This link has expired</h1>
        <p className="mb-6 text-bark-700">Reset links work once, for one hour. Please ask for a new one.</p>
        <Link href="/forgot-password" className="btn-primary w-full">Send a new link</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Choose a new password</h1>
      <NewPasswordForm action={resetPassword.bind(null, token)} submitLabel="Save new password" minLength={MIN_PASSWORD_LENGTH} />
    </>
  );
}
