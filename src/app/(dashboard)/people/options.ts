import type { TenantDb } from "@/lib/tenant-db";
import { displayName } from "@/lib/format";

/** Dropdown options shared by the person form. */
export async function memberFormOptions(db: TenantDb, excludeMemberId?: string) {
  const [households, people, customFields] = await Promise.all([
    db.household.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.member.findMany({
      where: excludeMemberId ? { id: { not: excludeMemberId } } : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, preferredName: true },
    }),
    db.customFieldDefinition.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }], select: { key: true, label: true, type: true, options: true } }),
  ]);
  return {
    households: households.map((h) => ({ value: h.id, label: h.name })),
    people: people.map((p) => ({ value: p.id, label: displayName(p) })),
    customFields,
  };
}
