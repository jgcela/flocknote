import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { displayName, formatDate, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Message" };

const DELIVERY_TONE = {
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "good",
  OPENED: "good",
  BOUNCED: "warm",
  FAILED: "warm",
  UNSUBSCRIBED: "neutral",
} as const;

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const m = await db.communication.findUnique({
    where: { id },
    include: {
      group: { select: { name: true } },
      sentBy: { select: { name: true } },
      recipients: {
        orderBy: [{ status: "asc" }, { address: "asc" }],
        include: { member: { select: { id: true, firstName: true, lastName: true, preferredName: true } } },
      },
    },
  });
  if (!m) notFound();
  const queued = m.recipients.filter((r) => r.status === "QUEUED").length;

  return (
    <>
      <PageHeader
        title={m.subject ?? "Text message"}
        description={`${m.channel === "SMS" ? "Text" : "Email"} to ${m.group?.name ?? "the whole church"}${m.sentBy ? ` · by ${m.sentBy.name}` : ""} · ${formatDate(m.sentAt ?? m.createdAt)}`}
        actions={<Link href="/messages" className="btn-secondary no-underline">All messages</Link>}
      />
      {m.status === "SENDING" ? (
        <p role="status" className="mb-6 rounded-xl bg-sky-50 px-4 py-3 text-sky-700">
          Sending… {queued} still in the queue. Refresh to see progress.
        </p>
      ) : null}
      <section aria-label="Totals" className="mb-6 grid gap-5 sm:grid-cols-3">
        <StatCard label="Recipients" value={m.recipientCount.toLocaleString()} />
        <StatCard label="Sent or delivered" value={m.deliveredCount.toLocaleString()} />
        <StatCard label="Failed or bounced" value={m.failedCount.toLocaleString()} />
      </section>
      <section className="card mb-6 p-6">
        <h2 className="mb-3 text-2xl font-bold">Message</h2>
        <p className="whitespace-pre-wrap">{m.body}</p>
      </section>
      <section className="card overflow-x-auto" aria-labelledby="log-heading">
        <h2 id="log-heading" className="px-6 pt-6 text-2xl font-bold">Delivery log</h2>
        <table className="data-table mt-4">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Sent to</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {m.recipients.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.member ? <Link href={`/people/${r.member.id}`} className="font-semibold text-clay-700 underline">{displayName(r.member)}</Link> : "—"}
                </td>
                <td className="break-all">{r.address}</td>
                <td>
                  <Badge tone={DELIVERY_TONE[r.status]}>{titleCase(r.status)}</Badge>
                  {r.errorMessage ? <div className="mt-1 text-sm text-clay-700">{r.errorMessage}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
