import { displayName } from "@/lib/format";
import type { TenantDb } from "@/lib/tenant-db";

export async function contributionOptions(db: TenantDb, includeFundId?: string) {
  const [people, households, funds] = await Promise.all([
    db.member.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, preferredName: true } }),
    db.household.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.fund.findMany({
      where: includeFundId ? { OR: [{ isActive: true }, { id: includeFundId }] } : { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  return {
    people: people.map((p) => ({ value: p.id, label: displayName(p) })),
    households: households.map((h) => ({ value: h.id, label: h.name })),
    funds: funds.map((f) => ({ value: f.id, label: f.name })),
  };
}
