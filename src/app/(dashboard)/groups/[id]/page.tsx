import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/form";
import { Badge, PageHeader } from "@/components/ui";
import { displayName, formatDate, titleCase } from "@/lib/format";
import { requireTenant } from "@/lib/tenant";
import { addSubscriber, removeSubscriber, saveGroup, setGroupArchived } from "../actions";
import { AddSubscriberForm } from "../add-subscriber-form";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const group = await db.group.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { unsubscribedAt: null },
        orderBy: [{ role: "desc" }, { member: { lastName: "asc" } }],
        include: { member: { select: { id: true, firstName: true, lastName: true, preferredName: true } } },
      },
    },
  });
  if (!group) notFound();

  const [otherGroups, people] = await Promise.all([
    db.group.findMany({ where: { id: { not: group.id }, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.member.findMany({
      where: { status: { in: ["ACTIVE", "VISITOR"] }, groupMemberships: { none: { groupId: group.id, unsubscribedAt: null } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, preferredName: true },
    }),
  ]);
  const archived = group.archivedAt !== null;

  return (
    <>
      <PageHeader
        title={group.name}
        description={archived ? `Archived on ${formatDate(group.archivedAt)}. It is hidden from the groups list.` : "Edit the group and manage who's in it."}
        actions={
          <ConfirmButton
            action={setGroupArchived.bind(null, group.id, !archived)}
            label={archived ? "Restore group" : "Archive group"}
            confirmText={archived ? `Restore ${group.name}?` : `Archive ${group.name}? Subscribers are kept and you can restore it later.`}
          />
        }
      />

      <section className="card mb-6 p-6" aria-labelledby="subscribers-heading">
        <h2 id="subscribers-heading" className="mb-4 text-2xl font-bold">
          Subscribers <span className="text-bark-700">({group.memberships.length})</span>
        </h2>
        {group.memberships.length === 0 ? (
          <p className="mb-6 text-bark-700">Nobody has joined yet.</p>
        ) : (
          <div className="mb-6 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Receives</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {group.memberships.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/people/${m.member.id}`} className="font-semibold text-clay-700 underline">{displayName(m.member)}</Link>
                    </td>
                    <td>{m.role === "MEMBER" ? "Member" : <Badge tone="warm">{titleCase(m.role)}</Badge>}</td>
                    <td className="space-x-1">
                      {m.emailEnabled ? <Badge tone="info">Email</Badge> : null}
                      {m.smsEnabled ? <Badge tone="info">Text</Badge> : null}
                      {!m.emailEnabled && !m.smsEnabled ? <Badge>None</Badge> : null}
                    </td>
                    <td className="text-right">
                      <ConfirmButton
                        action={removeSubscriber.bind(null, group.id, m.id)}
                        label="Remove"
                        confirmText={`Remove ${displayName(m.member)} from ${group.name}?`}
                        className="btn-secondary min-h-10 px-4 py-1.5"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <h3 className="mb-3 text-xl font-bold">Add someone</h3>
        <AddSubscriberForm action={addSubscriber.bind(null, group.id)} people={people.map((p) => ({ value: p.id, label: displayName(p) }))} />
      </section>

      <GroupForm
        action={saveGroup.bind(null, group.id)}
        submitLabel="Save changes"
        cancelHref="/groups"
        parentOptions={otherGroups.map((g) => ({ value: g.id, label: g.name }))}
        values={{ name: group.name, description: group.description, type: group.type, isPublic: group.isPublic, parentGroupId: group.parentGroupId }}
      />
    </>
  );
}
