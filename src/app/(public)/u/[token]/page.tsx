import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { describeUnsubscribeToken, unsubscribeWithToken } from "@/lib/messaging/opt-out";

export const metadata: Metadata = { title: "Unsubscribe", referrer: "no-referrer", robots: { index: false } };

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const info = await describeUnsubscribeToken(token);

  async function confirm() {
    "use server";
    await unsubscribeWithToken(token);
    redirect(`/u/${token}?done=1`);
  }

  const what = info?.channel === "sms" ? "text messages" : "emails";
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8"><Logo /></div>
      <div className="card w-full max-w-md p-8">
        {!info ? (
          <>
            <h1 className="mb-2 text-3xl font-bold">This link doesn&apos;t work</h1>
            <p className="text-bark-700">Please contact your church office to change what you receive.</p>
          </>
        ) : done || info.alreadyOut ? (
          <>
            <h1 className="mb-2 text-3xl font-bold">You&apos;re unsubscribed</h1>
            <p className="text-bark-700">You won&apos;t get group {what} from {info.churchName} any more. To start again, contact the church office.</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-3xl font-bold">Stop {what} from {info.churchName}?</h1>
            <p className="mb-6 text-bark-700">You&apos;ll stop receiving announcements and group {what} from {info.churchName}.</p>
            <form action={confirm}>
              <button type="submit" className="btn-primary w-full">Unsubscribe</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
