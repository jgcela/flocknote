import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { displayName, formatDate, formatMoney, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Giving" };

export default async function GivingPage() {
  const { db } = await requireTenant();
  const year = new Date().getUTCFullYear();

  const [funds, byFund, totals, recent] = await Promise.all([
    db.fund.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.contribution.groupBy({ by: ["fundId"], where: { taxYear: year }, _sum: { amountCents: true } }),
    db.contribution.aggregate({ where: { taxYear: year }, _sum: { amountCents: true }, _count: true }),
    db.contribution.findMany({
      orderBy: { receivedOn: "desc" },
      take: 25,
      include: {
        fund: { select: { name: true } },
        member: { select: { firstName: true, lastName: true, preferredName: true } },
        household: { select: { name: true } },
      },
    }),
  ]);
  const raised = new Map(byFund.map((r) => [r.fundId, r._sum.amountCents ?? 0]));

  return (
    <>
      <PageHeader
        title="Giving"
        description={`Donations recorded for the ${year} tax year.`}
        actions={
          <>
            <Link href="/giving/statements" className="btn-secondary no-underline">Year-end statements</Link>
            <Link href="/giving/new" className="btn-primary no-underline">Record a gift</Link>
          </>
        }
      />

      <section aria-label="Totals" className="grid gap-5 sm:grid-cols-2">
        <StatCard label={`Total given in ${year}`} value={formatMoney(totals._sum.amountCents ?? 0)} />
        <StatCard label="Gifts recorded" value={totals._count.toLocaleString()} />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold">Funds & campaigns</h2>
          <Link href="/giving/funds/new" className="font-semibold text-clay-700 underline">Add a fund</Link>
        </div>
        {funds.length === 0 ? (
          <EmptyState title="No funds yet">Create a fund to start recording gifts.</EmptyState>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {funds.map((f) => {
              const amount = raised.get(f.id) ?? 0;
              const pct = f.goalCents ? Math.min(100, Math.round((amount / f.goalCents) * 100)) : null;
              return (
                <li key={f.id} className="card p-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={f.type === "CAMPAIGN" ? "warm" : "info"}>{titleCase(f.type)}</Badge>
                    {!f.isTaxDeductible ? <Badge>Not tax-deductible</Badge> : null}
                  </div>
                  <h3 className="mt-3 text-xl font-bold">
                    <Link href={`/giving/funds/${f.id}`} className="text-bark-900 underline decoration-cream-300 hover:decoration-clay-600">{f.name}</Link>
                  </h3>
                  <p className="mt-1 font-display text-3xl font-bold">{formatMoney(amount)}</p>
                  {pct !== null && f.goalCents ? (
                    <div className="mt-3">
                      <div
                        className="h-3 overflow-hidden rounded-full bg-cream-200"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${f.name} progress toward goal`}
                      >
                        <div className="h-full rounded-full bg-meadow-600" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-bark-700">{pct}% of {formatMoney(f.goalCents)} goal</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-bold">Recent gifts</h2>
        {recent.length === 0 ? (
          <EmptyState title="No gifts recorded yet" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Giver</th>
                  <th scope="col">Fund</th>
                  <th scope="col">Method</th>
                  <th scope="col" className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/giving/gifts/${c.id}`} className="font-semibold text-clay-700 underline">{formatDate(c.receivedOn)}</Link>
                    </td>
                    <td>{c.member ? displayName(c.member) : (c.household?.name ?? "Anonymous")}</td>
                    <td>{c.fund.name}</td>
                    <td>{titleCase(c.method)}</td>
                    <td className="text-right font-semibold">{formatMoney(c.amountCents, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
