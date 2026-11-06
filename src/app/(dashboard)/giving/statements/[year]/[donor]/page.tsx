import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/form";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { buildStatements, DEFAULT_RECEIPT_NOTE, type DonorKey, type Statement } from "@/lib/giving";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Giving statement" };

type Org = { name: string; address: string | null; email: string | null; phone: string | null; taxId: string | null; receiptNote: string | null };

function StatementSheet({ s, year, org, issued }: { s: Statement; year: number; org: Org; issued: Date }) {
  return (
    <article className="card print-page mb-8 bg-white p-8 sm:p-12">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <p className="font-display text-2xl font-bold">{org.name}</p>
          {org.address ? <p className="whitespace-pre-line text-bark-700">{org.address}</p> : null}
          {org.phone || org.email ? <p className="text-bark-700">{[org.phone, org.email].filter(Boolean).join(" · ")}</p> : null}
          {org.taxId ? <p className="text-bark-700">Tax ID: {org.taxId}</p> : null}
        </div>
        <div className="sm:text-right">
          <h1 className="text-2xl font-bold">Giving statement {year}</h1>
          <p className="text-bark-700">Issued {formatDate(issued)}</p>
        </div>
      </header>
      <section className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wide text-bark-700">Prepared for</p>
        <p className="text-lg font-semibold">{s.name}</p>
        {s.addressLines.map((l) => <p key={l}>{l}</p>)}
      </section>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Fund</th>
            <th scope="col">Method</th>
            <th scope="col" className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {s.gifts.map((g) => (
            <tr key={g.id}>
              <td>{formatDate(g.receivedOn)}</td>
              <td>{g.fund}</td>
              <td>{g.method === "CHECK" && g.checkNumber ? `Check #${g.checkNumber}` : titleCase(g.method)}</td>
              <td className="text-right">{formatMoney(g.amountCents, g.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3} className="text-left">Total tax-deductible giving</th>
            <td className="text-right text-lg font-bold">{formatMoney(s.totalCents, s.currency)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-8">{org.receiptNote || DEFAULT_RECEIPT_NOTE}</p>
      <p className="mt-4">Thank you for your generosity.</p>
    </article>
  );
}

export default async function StatementPage({ params }: { params: Promise<{ year: string; donor: string }> }) {
  const { year: y, donor } = await params;
  const year = Number(y);
  if (!Number.isInteger(year)) notFound();
  if (donor !== "all" && !/^[hm]_[A-Za-z0-9]+$/.test(donor)) notFound();
  const { db, organization } = await requireTenant();
  const [statements, org] = await Promise.all([
    buildStatements(db, year, donor === "all" ? undefined : (donor as DonorKey)),
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: { name: true, address: true, email: true, phone: true, taxId: true, receiptNote: true },
    }),
  ]);
  if (statements.length === 0) notFound();
  const issued = new Date();

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <Link href={`/giving/statements?year=${year}`} className="btn-secondary no-underline">Back to statements</Link>
        <PrintButton label={statements.length > 1 ? `Print ${statements.length} statements` : "Print"} />
      </div>
      {statements.map((s) => <StatementSheet key={s.key} s={s} year={year} org={org} issued={issued} />)}
    </>
  );
}
