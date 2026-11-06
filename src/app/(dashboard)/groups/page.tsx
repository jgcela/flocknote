import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { db } = await requireTenant();
  const showArchived = (await searchParams).archived === "1";
  const archivedCount = await db.group.count({ where: { archivedAt: { not: null } } });
  const groups = await db.group.findMany({
    where: { archivedAt: showArchived ? { not: null } : null },
    orderBy: { name: "asc" },
    include: {
      parentGroup: { select: { name: true } },
      _count: { select: { memberships: { where: { unsubscribedAt: null } } } },
    },
  });

  return (
    <>
      <PageHeader
        title={showArchived ? "Archived groups" : "Groups"}
        description="Ministries, classes and teams that people can join and hear from."
        actions={<Link href="/groups/new" className="btn-primary no-underline">Create a group</Link>}
      />
      {groups.length === 0 ? (
        <EmptyState title={showArchived ? "No archived groups" : "No groups yet"}>
          {showArchived ? null : "Create a ministry or small group so people can subscribe to it."}
        </EmptyState>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id} className="card flex flex-col p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warm">{titleCase(g.type)}</Badge>
                {g.isPublic ? <Badge tone="good">Open to join</Badge> : <Badge>Invite only</Badge>}
              </div>
              <h2 className="mt-3 text-2xl font-bold">
                <Link href={`/groups/${g.id}`} className="text-bark-900 underline decoration-clay-600 decoration-2">{g.name}</Link>
              </h2>
              {g.parentGroup ? <p className="text-bark-700">Part of {g.parentGroup.name}</p> : null}
              {g.description ? <p className="mt-2 text-bark-700">{g.description}</p> : null}
              <p className="mt-auto pt-4 font-semibold">
                {g._count.memberships} {g._count.memberships === 1 ? "subscriber" : "subscribers"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {showArchived ? (
        <p className="mt-8"><Link href="/groups" className="font-semibold text-clay-700 underline">Back to active groups</Link></p>
      ) : archivedCount > 0 ? (
        <p className="mt-8">
          <Link href="/groups?archived=1" className="font-semibold text-clay-700 underline">
            See {archivedCount} archived {archivedCount === 1 ? "group" : "groups"}
          </Link>
        </p>
      ) : null}
    </>
  );
}
