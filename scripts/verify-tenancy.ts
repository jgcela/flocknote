/**
 * Tenant-isolation smoke test. Run after `npm run db:seed`:
 *   npx tsx scripts/verify-tenancy.ts
 * Exits non-zero if any check fails.
 */
import { prisma } from "../src/lib/db";
import { tenantDb } from "../src/lib/tenant-db";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}
async function rejects(p: Promise<unknown>) {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}

async function main() {
  const a = await prisma.organization.findUniqueOrThrow({ where: { slug: "grace-fellowship" } });
  const b = await prisma.organization.findUniqueOrThrow({ where: { slug: "st-marks" } });
  const dbA = tenantDb(a.id);
  const memberB = await prisma.member.findFirstOrThrow({ where: { organizationId: b.id } });
  const fundB = await prisma.fund.findFirstOrThrow({ where: { organizationId: b.id } });
  const householdA = await prisma.household.findFirstOrThrow({ where: { organizationId: a.id } });

  const listed = await dbA.member.findMany();
  check("findMany only returns own church", listed.length > 0 && listed.every((m) => m.organizationId === a.id));
  check("findUnique by another church's id returns null", (await dbA.member.findUnique({ where: { id: memberB.id } })) === null);
  check("count is scoped", (await dbA.member.count()) === (await prisma.member.count({ where: { organizationId: a.id } })));
  check("update of another church's row is rejected", await rejects(dbA.member.update({ where: { id: memberB.id }, data: { firstName: "x" } })));
  check("updateMany cannot touch another church", (await dbA.member.updateMany({ where: { id: memberB.id }, data: { firstName: "x" } })).count === 0);
  check("delete of another church's row is rejected", await rejects(dbA.member.delete({ where: { id: memberB.id } })));

  const created = await dbA.member.create({ data: { organizationId: b.id, firstName: "Spoof", lastName: "Attempt" } });
  check("create forces organizationId to current church", created.organizationId === a.id);
  await prisma.member.delete({ where: { id: created.id } });

  check(
    "DB rejects contribution pointing at another church's fund",
    await rejects(dbA.contribution.create({ data: { organizationId: a.id, fundId: fundB.id, amountCents: 100, receivedOn: new Date(), taxYear: 2026 } })),
  );
  check(
    "DB rejects (even with raw client) member in another church's household",
    await rejects(prisma.member.create({ data: { organizationId: b.id, householdId: householdA.id, firstName: "x", lastName: "y" } })),
  );

  const userB = await prisma.user.findFirstOrThrow({ where: { organizationId: b.id } });
  const inviteB = await prisma.userInvitation.create({
    data: { organizationId: b.id, email: "verify-tenancy@example.test", tokenHash: `verify-${Date.now()}`, expiresAt: new Date(Date.now() + 60_000) },
  });
  check("invitations are scoped", (await dbA.userInvitation.findUnique({ where: { id: inviteB.id } })) === null);
  check("cannot revoke another church's invitation", (await dbA.userInvitation.updateMany({ where: { id: inviteB.id }, data: { revokedAt: new Date() } })).count === 0);
  check("cannot change another church's staff", (await dbA.user.updateMany({ where: { id: userB.id }, data: { disabledAt: new Date() } })).count === 0);
  check(
    "DB rejects invitation attributed to another church's user",
    await rejects(prisma.userInvitation.create({ data: { organizationId: a.id, invitedById: userB.id, email: "x@example.test", tokenHash: `verify2-${Date.now()}`, expiresAt: new Date() } })),
  );
  await prisma.userInvitation.delete({ where: { id: inviteB.id } });

  const still = await prisma.member.findUniqueOrThrow({ where: { id: memberB.id } });
  check("other church's data unchanged", still.firstName === memberB.firstName);

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll tenant-isolation checks passed.");
}

main().finally(() => prisma.$disconnect());
