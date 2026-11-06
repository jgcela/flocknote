import type { Metadata } from "next";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const { db } = await requireTenant();
  const groups = await db.group.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    include: {
      parentGroup: { select: { name: true } },
      _count: { select: { memberships: { where: { unsubscribedAt: null } } } },
    },
  });

  return (
    <>
      <PageHeader title="Groups" description="Ministries, classes and teams that people can join and hear from." />
      {groups.length === 0 ? (
        <EmptyState title="No groups yet">Create a ministry or small group so people can subscribe to it.</EmptyState>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id} className="card flex flex-col p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warm">{titleCase(g.type)}</Badge>
                {g.isPublic ? <Badge tone="good">Open to join</Badge> : <Badge>Invite only</Badge>}
              </div>
              <h2 className="mt-3 text-2xl font-bold">{g.name}</h2>
              {g.parentGroup ? <p className="text-bark-700">Part of {g.parentGroup.name}</p> : null}
              {g.description ? <p className="mt-2 text-bark-700">{g.description}</p> : null}
              <p className="mt-auto pt-4 font-semibold">
                {g._count.memberships} {g._count.memberships === 1 ? "subscriber" : "subscribers"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
