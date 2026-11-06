import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, SubNav } from "@/components/ui";
import { displayName, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Households" };

const TABS = [
  { href: "/people", label: "People" },
  { href: "/people/households", label: "Households" },
];

export default async function HouseholdsPage() {
  const { db } = await requireTenant();
  const households = await db.household.findMany({
    orderBy: { name: "asc" },
    take: 200,
    include: {
      primaryContact: { select: { firstName: true, lastName: true, preferredName: true, email: true, phone: true } },
      members: {
        orderBy: { birthDate: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          householdRole: true,
          parentLinks: { select: { parent: { select: { firstName: true } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="People & Households"
        description="Families and the people who live together."
        actions={<Link href="/people/households/new" className="btn-primary no-underline">Add a household</Link>}
      />
      <SubNav items={TABS} current="/people/households" />
      {households.length === 0 ? (
        <EmptyState title="No households yet">Group people who live together into a household.</EmptyState>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {households.map((h) => (
            <li key={h.id} className="card p-6">
              <h2 className="text-2xl font-bold">
                <Link href={`/people/households/${h.id}`} className="text-bark-900 underline decoration-clay-600 decoration-2">{h.name}</Link>
              </h2>
              <p className="mt-1 text-bark-700">
                {[h.addressLine1, h.city, h.region].filter(Boolean).join(", ") || "No address on file"}
              </p>
              <p className="mt-3">
                <span className="font-semibold">Primary contact: </span>
                {h.primaryContact ? displayName(h.primaryContact) : "Not set"}
              </p>
              <ul className="mt-4 divide-y divide-cream-200 border-t border-cream-200">
                {h.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5">
                    <span>{displayName(m)}</span>
                    <span className="text-right text-bark-700">
                      {m.householdRole ? titleCase(m.householdRole) : ""}
                      {m.parentLinks.length > 0 ? (
                        <span className="block text-sm">
                          Child of {m.parentLinks.map((l) => l.parent.firstName).join(" & ")}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
