/**
 * Giving checks: amount parsing and year-end statement grouping. Run after seeding:
 *   npx tsx scripts/verify-giving.ts
 */
import { prisma } from "../src/lib/db";
import { buildStatements, moneyField, statementText } from "../src/lib/giving";
import { tenantDb } from "../src/lib/tenant-db";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}
const cents = (v: string) => {
  const r = moneyField.safeParse(v);
  return r.success ? r.data : null;
};

async function main() {
  check("parses 25", cents("25") === 2500);
  check("parses $1,234.50", cents("$1,234.50") === 123450);
  check("parses 0.1 as 10 cents", cents("0.1") === 10);
  check("no float drift on 19.99", cents("19.99") === 1999);
  check("rejects 0", cents("0") === null);
  check("rejects negative", cents("-5") === null);
  check("rejects 3 decimals", cents("1.005") === null);
  check("rejects text", cents("ten") === null);

  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "grace-fellowship" } });
  const other = await prisma.organization.findUniqueOrThrow({ where: { slug: "st-marks" } });
  const db = tenantDb(org.id);
  const year = 2031; // isolated year so seeded data doesn't interfere

  const [household] = await db.household.findMany({ take: 1, include: { members: true } });
  const loner = await db.member.create({ data: { organizationId: org.id, firstName: "Solo", lastName: "Giver", email: "solo@example.org" } });
  const deductible = await db.fund.create({ data: { organizationId: org.id, name: `Verify deductible ${Date.now()}` } });
  const nonDeductible = await db.fund.create({ data: { organizationId: org.id, name: `Verify dinner ${Date.now()}`, isTaxDeductible: false } });
  const otherFund = await prisma.fund.findFirstOrThrow({ where: { organizationId: other.id } });
  const base = { organizationId: org.id, receivedOn: new Date(Date.UTC(year, 2, 1)), taxYear: year };
  const hhMember = household!.members[0]!;

  await db.contribution.createMany({
    data: [
      { ...base, fundId: deductible.id, memberId: hhMember.id, householdId: household!.id, amountCents: 10_000 },
      { ...base, fundId: deductible.id, householdId: household!.id, amountCents: 2_500 },
      { ...base, fundId: nonDeductible.id, householdId: household!.id, amountCents: 99_900 },
      { ...base, fundId: deductible.id, memberId: loner.id, amountCents: 5_000 },
      { ...base, fundId: deductible.id, amountCents: 777 }, // anonymous
      { ...base, fundId: deductible.id, memberId: loner.id, amountCents: 1_000, taxYear: year + 1 },
    ],
  });
  await prisma.contribution.create({ data: { organizationId: other.id, fundId: otherFund.id, amountCents: 123, receivedOn: base.receivedOn, taxYear: year } });

  const statements = await buildStatements(db, year);
  const hh = statements.find((s) => s.key === `h_${household!.id}`);
  const solo = statements.find((s) => s.key === `m_${loner.id}`);
  check("two donors (household + person), anonymous excluded", statements.length === 2);
  check("household total excludes non-deductible fund", hh?.totalCents === 12_500 && hh.gifts.length === 2);
  check("person total only counts that tax year", solo?.totalCents === 5_000);
  check("person statement uses their email", solo?.email === "solo@example.org");
  check("other church's gifts never included", statements.every((s) => s.gifts.every((g) => g.amountCents !== 123)));
  const single = await buildStatements(db, year, `m_${loner.id}`);
  check("single-donor lookup", single.length === 1 && single[0]!.totalCents === 5_000);
  const text = statementText(hh!, year, { name: org.name, address: "1 Main St", taxId: "12-3456789", receiptNote: null });
  check("statement text has total, tax id and IRS wording", text.includes("$125.00") && text.includes("12-3456789") && text.includes("intangible religious benefits"));

  await prisma.contribution.deleteMany({ where: { taxYear: { in: [year, year + 1] } } });
  await prisma.fund.deleteMany({ where: { id: { in: [deductible.id, nonDeductible.id] } } });
  await prisma.member.delete({ where: { id: loner.id } });

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll giving checks passed.");
}

main().finally(() => prisma.$disconnect());
