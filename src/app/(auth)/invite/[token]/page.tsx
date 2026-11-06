import type { Metadata } from "next";
import Link from "next/link";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { findValidInvitation } from "@/lib/account-tokens";
import { acceptInvitation } from "../../account-actions";
import { NewPasswordForm } from "../../account-forms";

export const metadata: Metadata = { title: "Accept invitation", referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findValidInvitation(token);

  if (!invite) {
    return (
      <>
        <h1 className="mb-2 text-3xl font-bold">This invitation can&apos;t be used</h1>
        <p className="mb-6 text-bark-700">
          It may have expired, been cancelled, or already been accepted. Ask your church administrator to send a new one.
        </p>
        <Link href="/login" className="btn-secondary w-full">Go to sign in</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Join {invite.organization.name}</h1>
      <p className="mb-6 text-bark-700">
        You&apos;ve been invited as {invite.role === "ADMIN" ? "an administrator" : "a staff member"}. You&apos;ll sign in with{" "}
        <strong className="break-all">{invite.email}</strong>.
      </p>
      <NewPasswordForm action={acceptInvitation.bind(null, token)} submitLabel="Create my account" minLength={MIN_PASSWORD_LENGTH} askName defaultName={invite.name} />
    </>
  );
}
