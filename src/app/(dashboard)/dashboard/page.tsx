import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  const { db, user } = await requireTenant();
  const year = new Date().getUTCFullYear();

  const [people, households, groups, giving, recentMessages] = await Promise.all([
    db.member.count({ where: { status: { in: ["ACTIVE", "VISITOR"] } } }),
    db.household.count(),
    db.group.count({ where: { archivedAt: null } }),
    db.contribution.aggregate({ where: { taxYear: year }, _sum: { amountCents: true } }),
    db.communication.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { group: { select: { name: true } } } }),
  ]);

  return (
    <>
      <PageHeader title={`Good to see you, ${user.name.split(" ")[0]}`} description="Here's how your flock is doing." />

      <section aria-label="Summary" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="People" value={people.toLocaleString()} hint="Active members and visitors" />
        <StatCard label="Households" value={households.toLocaleString()} />
        <StatCard label="Groups" value={groups.toLocaleString()} hint="Ministries and small groups" />
        <StatCard label={`Giving in ${year}`} value={formatMoney(giving._sum.amountCents ?? 0)} />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent messages</h2>
          <Link href="/messages" className="font-semibold text-clay-700 underline">See all messages</Link>
        </div>
        <div className="card overflow-x-auto">
          {recentMessages.length === 0 ? (
            <p className="p-6 text-bark-700">No messages yet.</p>
          ) : (
            <ul>
              {recentMessages.map((m) => (
                <li key={m.id} className="flex flex-col gap-1 border-b border-cream-200 px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">{m.subject ?? m.body.slice(0, 60)}</span>
                  <span className="text-bark-700">
                    {m.channel === "SMS" ? "Text" : "Email"} · {m.group?.name ?? "Whole church"} · {formatDate(m.sentAt ?? m.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
