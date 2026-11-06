/**
 * Demo data: two churches, so you can see tenant isolation in action.
 * Sign in as   pastor@gracefellowship.test   /  demo-password-123
 *          or  admin@stmarks.test           /  demo-password-123
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo-password-123";

async function seedChurch(opts: { name: string; slug: string; adminName: string; adminEmail: string; families: string[][] }) {
  const existing = await prisma.organization.findUnique({ where: { slug: opts.slug } });
  if (existing) await prisma.organization.delete({ where: { id: existing.id } });

  const org = await prisma.organization.create({ data: { name: opts.name, slug: opts.slug } });
  const organizationId = org.id;
  const admin = await prisma.user.create({
    data: {
      organizationId,
      name: opts.adminName,
      email: opts.adminEmail,
      role: "OWNER",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });

  await prisma.customFieldDefinition.createMany({
    data: [
      { organizationId, key: "baptism_date", label: "Baptism date", type: "DATE" },
      { organizationId, key: "tshirt_size", label: "T-shirt size", type: "SELECT", options: ["S", "M", "L", "XL"] },
    ],
  });

  const [worship, youth, care] = await Promise.all([
    prisma.group.create({ data: { organizationId, name: "Worship Team", type: "MINISTRY", description: "Musicians and singers for Sunday services." } }),
    prisma.group.create({ data: { organizationId, name: "Youth Ministry", type: "MINISTRY", description: "Grades 6–12." } }),
    prisma.group.create({ data: { organizationId, name: "Care Meals", type: "VOLUNTEER_TEAM", description: "Meals for families in need.", isPublic: false } }),
  ]);
  await prisma.group.create({
    data: { organizationId, name: "Youth Leaders", type: "VOLUNTEER_TEAM", parentGroupId: youth.id, isPublic: false },
  });

  const general = await prisma.fund.create({ data: { organizationId, name: "General Fund", type: "GENERAL" } });
  const roof = await prisma.fund.create({
    data: { organizationId, name: "Roof Campaign", type: "CAMPAIGN", goalCents: 5_000_000, startsOn: new Date("2026-01-01") },
  });

  const allMembers = [];
  for (const [i, [last, ...firsts]] of opts.families.entries()) {
    const household = await prisma.household.create({
      data: { organizationId, name: `The ${last} Family`, addressLine1: `${100 + i * 7} Oak Street`, city: "Springfield", region: "IL" },
    });
    const people = [];
    for (const [j, first] of firsts.entries()) {
      const isChild = j >= 2;
      people.push(
        await prisma.member.create({
          data: {
            organizationId,
            householdId: household.id,
            householdRole: j === 0 ? "HEAD" : j === 1 ? "SPOUSE" : "CHILD",
            firstName: first!,
            lastName: last!,
            email: isChild ? null : `${first!.toLowerCase()}.${last!.toLowerCase()}@example.com`,
            phone: isChild ? null : `+1555${String(1000000 + i * 100 + j).slice(-7)}`,
            birthDate: new Date(isChild ? `201${j}-0${j + 1}-15` : `198${j}-0${i + 1}-10`),
            smsOptIn: j === 0,
            preferredChannel: j === 0 ? "BOTH" : "EMAIL",
            status: i === opts.families.length - 1 ? "VISITOR" : "ACTIVE",
            customAttributes: isChild ? {} : { tshirt_size: j === 0 ? "L" : "M" },
          },
        }),
      );
    }
    await prisma.household.update({ where: { id: household.id }, data: { primaryContactId: people[0]!.id } });

    const [parentA, parentB, ...kids] = people;
    for (const kid of kids) {
      for (const parent of [parentA, parentB]) {
        if (!parent) continue;
        await prisma.parentalRelationship.create({
          data: { organizationId, parentId: parent.id, childId: kid.id, isPrimaryGuardian: parent === parentA },
        });
      }
      await prisma.groupMembership.create({ data: { organizationId, groupId: youth.id, memberId: kid.id } });
    }
    if (parentA) {
      await prisma.groupMembership.create({
        data: { organizationId, groupId: i % 2 ? care.id : worship.id, memberId: parentA.id, role: i === 0 ? "LEADER" : "MEMBER", smsEnabled: true },
      });
      for (const [k, month] of [1, 2, 3, 4].entries()) {
        await prisma.contribution.create({
          data: {
            organizationId,
            memberId: parentA.id,
            householdId: household.id,
            fundId: k === 3 ? roof.id : general.id,
            amountCents: 5_000 + i * 2_500 + k * 1_000,
            receivedOn: new Date(Date.UTC(2026, month, 7)),
            taxYear: 2026,
            method: k % 2 ? "CHECK" : "ONLINE",
            checkNumber: k % 2 ? String(1000 + i * 10 + k) : null,
          },
        });
      }
    }
    allMembers.push(...people);
  }
  await prisma.contribution.create({
    data: { organizationId, fundId: general.id, amountCents: 4_250, receivedOn: new Date(Date.UTC(2026, 4, 3)), taxYear: 2026, method: "CASH", note: "Loose plate" },
  });

  const adults = allMembers.filter((m) => m.email);
  const email = await prisma.communication.create({
    data: {
      organizationId,
      channel: "EMAIL",
      status: "SENT",
      subject: "This Sunday: potluck after the 10am service",
      body: "Bring a dish to share! Tables will be set up in the fellowship hall.",
      sentById: admin.id,
      sentAt: new Date(Date.UTC(2026, 9, 30, 15)),
      recipientCount: adults.length,
      deliveredCount: adults.length - 1,
      failedCount: 1,
    },
  });
  await prisma.communicationRecipient.createMany({
    data: adults.map((m, idx) => ({
      organizationId,
      communicationId: email.id,
      memberId: m.id,
      address: m.email!,
      status: idx === 0 ? ("BOUNCED" as const) : ("DELIVERED" as const),
      deliveredAt: idx === 0 ? null : new Date(Date.UTC(2026, 9, 30, 15, 1)),
    })),
  });
  await prisma.communication.create({
    data: {
      organizationId,
      channel: "SMS",
      status: "SCHEDULED",
      body: "Worship Team: rehearsal moved to 6:30pm Thursday.",
      groupId: worship.id,
      sentById: admin.id,
      scheduledFor: new Date(Date.UTC(2026, 10, 12, 18)),
    },
  });

  return org;
}

async function main() {
  await seedChurch({
    name: "Grace Fellowship",
    slug: "grace-fellowship",
    adminName: "Ruth Alvarez",
    adminEmail: "pastor@gracefellowship.test",
    families: [
      ["Garcia", "Miguel", "Ana", "Sofia", "Mateo"],
      ["Okafor", "Chidi", "Ngozi", "Ada"],
      ["Lindqvist", "Erik", "Maja"],
      ["Brooks", "Dorothy"],
    ],
  });
  await seedChurch({
    name: "St. Mark's Parish",
    slug: "st-marks",
    adminName: "Thomas Reilly",
    adminEmail: "admin@stmarks.test",
    families: [
      ["Nguyen", "Linh", "Bao", "Kim"],
      ["Murphy", "Sean", "Claire"],
    ],
  });
  console.log(`Seeded 2 churches. Password for both demo admins: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
