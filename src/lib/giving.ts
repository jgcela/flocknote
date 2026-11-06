import { z } from "zod";
import type { TenantDb } from "./tenant-db";
import { displayName, formatDate, formatMoney } from "./format";

export const DEFAULT_RECEIPT_NOTE =
  "No goods or services were provided in exchange for these contributions other than intangible religious benefits. " +
  "Please keep this statement for your tax records.";

/** "1,234.50" / "$20" → cents. Rejects zero, negatives and more than 2 decimals. */
export const moneyField = z
  .string({ required_error: "Please enter an amount." })
  .trim()
  .transform((v) => v.replace(/[$,\s]/g, ""))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter an amount like 25 or 25.50.")
  .transform((v) => Math.round(Number(v) * 100))
  .refine((c) => c > 0, "The amount must be more than zero.")
  .refine((c) => c <= 1_000_000_000, "That amount is too large.");

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

/**
 * Statements are issued per household when the gift is linked to one,
 * otherwise per person. Keys: "h_<householdId>" or "m_<memberId>".
 */
export type DonorKey = `h_${string}` | `m_${string}`;

export function donorKeyOf(c: { householdId: string | null; memberId: string | null }): DonorKey | null {
  if (c.householdId) return `h_${c.householdId}`;
  if (c.memberId) return `m_${c.memberId}`;
  return null;
}

export type StatementGift = { id: string; receivedOn: Date; fund: string; method: string; checkNumber: string | null; amountCents: number; currency: string };

export type Statement = {
  key: DonorKey;
  name: string;
  addressLines: string[];
  email: string | null;
  /** Tax-deductible gifts only. */
  gifts: StatementGift[];
  totalCents: number;
  currency: string;
};

/** All donors with tax-deductible gifts in `year`, or one donor when `only` is given. */
export async function buildStatements(db: TenantDb, year: number, only?: DonorKey): Promise<Statement[]> {
  const filter =
    only === undefined ? {} : only.startsWith("h_") ? { householdId: only.slice(2) } : { memberId: only.slice(2), householdId: null };
  const gifts = await db.contribution.findMany({
    where: { taxYear: year, fund: { isTaxDeductible: true }, OR: [{ householdId: { not: null } }, { memberId: { not: null } }], ...filter },
    orderBy: [{ receivedOn: "asc" }, { createdAt: "asc" }],
    include: { fund: { select: { name: true } } },
  });

  const byDonor = new Map<DonorKey, typeof gifts>();
  for (const g of gifts) {
    const key = donorKeyOf(g);
    if (!key) continue;
    byDonor.set(key, [...(byDonor.get(key) ?? []), g]);
  }

  const householdIds = [...byDonor.keys()].filter((k) => k.startsWith("h_")).map((k) => k.slice(2));
  const memberIds = [...byDonor.keys()].filter((k) => k.startsWith("m_")).map((k) => k.slice(2));
  const [households, members] = await Promise.all([
    db.household.findMany({
      where: { id: { in: householdIds } },
      include: {
        primaryContact: { select: { email: true } },
        members: { where: { email: { not: null } }, orderBy: { householdRole: "asc" }, select: { email: true } },
      },
    }),
    db.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, firstName: true, lastName: true, preferredName: true, email: true } }),
  ]);
  const hh = new Map(households.map((h) => [h.id, h]));
  const mm = new Map(members.map((m) => [m.id, m]));

  const out: Statement[] = [];
  for (const [key, list] of byDonor) {
    let name = "Unknown donor";
    let addressLines: string[] = [];
    let email: string | null = null;
    if (key.startsWith("h_")) {
      const h = hh.get(key.slice(2));
      if (h) {
        name = h.name;
        const cityLine = [h.city, [h.region, h.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        addressLines = [h.addressLine1, h.addressLine2, cityLine, h.country].filter((l): l is string => Boolean(l));
        email = h.primaryContact?.email ?? h.members[0]?.email ?? null;
      }
    } else {
      const m = mm.get(key.slice(2));
      if (m) {
        name = displayName(m);
        email = m.email;
      }
    }
    out.push({
      key,
      name,
      addressLines,
      email,
      gifts: list.map((g) => ({ id: g.id, receivedOn: g.receivedOn, fund: g.fund.name, method: g.method, checkNumber: g.checkNumber, amountCents: g.amountCents, currency: g.currency })),
      totalCents: list.reduce((a, g) => a + g.amountCents, 0),
      currency: list[0]?.currency ?? "USD",
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain-text statement for email. */
export function statementText(s: Statement, year: number, org: { name: string; address: string | null; taxId: string | null; receiptNote: string | null }) {
  const lines = [
    `${org.name} — giving statement for ${year}`,
    "",
    `Prepared for: ${s.name}`,
    ...s.addressLines,
    "",
    "Date          Fund                          Amount",
    ...s.gifts.map((g) => `${formatDate(g.receivedOn).padEnd(14)}${g.fund.slice(0, 28).padEnd(30)}${formatMoney(g.amountCents, g.currency)}`),
    "",
    `Total tax-deductible giving in ${year}: ${formatMoney(s.totalCents, s.currency)}`,
    "",
    org.receiptNote || DEFAULT_RECEIPT_NOTE,
    "",
    org.name,
    ...(org.address ? [org.address] : []),
    ...(org.taxId ? [`Tax ID: ${org.taxId}`] : []),
  ];
  return lines.join("\n");
}
