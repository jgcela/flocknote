import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Messages" };

const STATUS_TONE = { SENT: "good", SCHEDULED: "info", SENDING: "info", DRAFT: "neutral", FAILED: "warm", CANCELED: "neutral" } as const;

export default async function MessagesPage() {
  const { db } = await requireTenant();
  const messages = await db.communication.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { group: { select: { name: true } }, sentBy: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Messages"
        description="Every email and text sent to your church, with delivery results."
        actions={<Link href="/messages/new" className="btn-primary no-underline">New message</Link>}
      />
      {messages.length === 0 ? (
        <EmptyState title="No messages yet">Emails and texts you send will be logged here.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Message</th>
                <th scope="col">Type</th>
                <th scope="col">Sent to</th>
                <th scope="col">Delivered</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/messages/${m.id}`} className="font-semibold text-clay-700 underline">{m.subject ?? m.body.slice(0, 70)}</Link>
                    {m.sentBy ? <div className="text-sm text-bark-700">by {m.sentBy.name}</div> : null}
                  </td>
                  <td>{m.channel === "SMS" ? "Text" : "Email"}</td>
                  <td>{m.group?.name ?? "Whole church"}</td>
                  <td>
                    {m.deliveredCount} of {m.recipientCount}
                  </td>
                  <td><Badge tone={STATUS_TONE[m.status]}>{titleCase(m.status)}</Badge></td>
                  <td>{formatDate(m.sentAt ?? m.scheduledFor ?? m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
