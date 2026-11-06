import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/form";
import { EmptyState, PageHeader, StatCard, SubNav } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { buildStatements } from "@/lib/giving";
import { requireTenant } from "@/lib/tenant";
import { emailStatements } from "../actions";

export const metadata: Metadata = { title: "Giving statements" };

export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { db, organization } = await requireTenant();
  const years = (await db.contribution.groupBy({ by: ["taxYear"], orderBy: { taxYear: "desc" } })).map((r) => r.taxYear);
  const requested = Number((await searchParams).year);
  // Default to last year in Jan–Mar (statement season), otherwise this year.
  const now = new Date();
  const fallback = now.getUTCMonth() < 3 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const year = Number.isInteger(requested) && requested > 1900 ? requested : years.includes(fallback) ? fallback : (years[0] ?? fallback);

  const [statements, org] = await Promise.all([
    buildStatements(db, year),
    db.organization.findUniqueOrThrow({ where: { id: organization.id }, select: { address: true, taxId: true } }),
  ]);
  const withEmail = statements.filter((s) => s.email).length;
  const total = statements.reduce((a, s) => a + s.totalCents, 0);

  return (
    <>
      <PageHeader
        title={`Giving statements for ${year}`}
        description="Year-end statements of tax-deductible giving, one per household (or per person when they're not in a household)."
        actions={
          statements.length ? (
            <>
              <Link href={`/giving/statements/${year}/all`} className="btn-secondary no-underline">Print all</Link>
              {withEmail ? (
                <ConfirmButton
                  action={emailStatements.bind(null, year, null)}
                  label={`Email ${withEmail} statement${withEmail === 1 ? "" : "s"}`}
                  confirmText={`Email ${year} statements to ${withEmail} donor${withEmail === 1 ? "" : "s"}? Each person only sees their own gifts.`}
                  className="btn-primary"
                />
              ) : null}
            </>
          ) : undefined
        }
      />
      {years.length > 1 ? <SubNav items={years.map((y) => ({ href: `/giving/statements?year=${y}`, label: String(y) }))} current={`/giving/statements?year=${year}`} /> : null}
      {!org.address || !org.taxId ? (
        <p role="note" className="mb-6 rounded-xl bg-sky-50 px-4 py-3 text-sky-700">
          Statements look more official with your church&apos;s address and tax ID.{" "}
          <Link href="/settings/church" className="font-semibold underline">Add them in Church details</Link>.
        </p>
      ) : null}
      {statements.length === 0 ? (
        <EmptyState title={`No tax-deductible gifts in ${year}`}>Gifts linked to a person or household appear here.</EmptyState>
      ) : (
        <>
          <section aria-label="Totals" className="mb-6 grid gap-5 sm:grid-cols-3">
            <StatCard label="Donors" value={statements.length.toLocaleString()} />
            <StatCard label="With email" value={withEmail.toLocaleString()} hint={withEmail < statements.length ? "Print the rest" : undefined} />
            <StatCard label="Total" value={formatMoney(total)} />
          </section>
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Donor</th>
                  <th scope="col">Email</th>
                  <th scope="col">Gifts</th>
                  <th scope="col" className="text-right">Total</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => (
                  <tr key={s.key}>
                    <td className="font-semibold">{s.name}</td>
                    <td className="break-all">{s.email ?? <span className="text-bark-700">None (print)</span>}</td>
                    <td>{s.gifts.length}</td>
                    <td className="text-right font-semibold">{formatMoney(s.totalCents, s.currency)}</td>
                    <td className="text-right">
                      <span className="inline-flex flex-wrap justify-end gap-2">
                        <Link href={`/giving/statements/${year}/${s.key}`} className="btn-secondary min-h-10 px-4 py-1.5 no-underline">View</Link>
                        {s.email ? (
                          <ConfirmButton
                            action={emailStatements.bind(null, year, s.key)}
                            label="Email"
                            confirmText={`Email the ${year} statement to ${s.email}?`}
                            className="btn-secondary min-h-10 px-4 py-1.5"
                          />
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
