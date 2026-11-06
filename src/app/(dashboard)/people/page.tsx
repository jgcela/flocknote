import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader, SubNav } from "@/components/ui";
import { displayName, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "People" };

const TABS = [
  { href: "/people", label: "People" },
  { href: "/people/households", label: "Households" },
];

export default async function PeoplePage() {
  const { db } = await requireTenant();
  const members = await db.member.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
    include: { household: { select: { name: true } }, _count: { select: { groupMemberships: true } } },
  });

  return (
    <>
      <PageHeader
        title="People & Households"
        description="Everyone in your church directory."
        actions={<Link href="/people/new" className="btn-primary no-underline">Add a person</Link>}
      />
      <SubNav items={TABS} current="/people" />
      {members.length === 0 ? (
        <EmptyState title="No people yet">Add your first member to start building your directory.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Contact</th>
                <th scope="col">Household</th>
                <th scope="col">Groups</th>
                <th scope="col">Receives</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/people/${m.id}`} className="font-semibold text-clay-700 underline">{displayName(m)}</Link>
                  </td>
                  <td>
                    <div>{m.email ?? <span className="text-bark-500">No email</span>}</div>
                    <div className="text-bark-700">{m.phone ?? ""}</div>
                  </td>
                  <td>
                    {m.household?.name ?? <span className="text-bark-500">—</span>}
                    {m.householdRole ? <div className="text-sm text-bark-700">{titleCase(m.householdRole)}</div> : null}
                  </td>
                  <td>{m._count.groupMemberships}</td>
                  <td className="space-x-1">
                    {m.emailOptIn ? <Badge tone="info">Email</Badge> : null}
                    {m.smsOptIn ? <Badge tone="info">Text</Badge> : null}
                    {!m.emailOptIn && !m.smsOptIn ? <Badge>None</Badge> : null}
                  </td>
                  <td>
                    <Badge tone={m.status === "ACTIVE" ? "good" : m.status === "VISITOR" ? "warm" : "neutral"}>
                      {titleCase(m.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
