import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireTenant } from "@/lib/tenant";
import { saveGroup } from "../actions";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Create a group" };

export default async function NewGroupPage() {
  const { db } = await requireTenant();
  const groups = await db.group.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Create a group" description="Ministries, classes and teams people can subscribe to." />
      <GroupForm
        action={saveGroup.bind(null, null)}
        submitLabel="Create group"
        cancelHref="/groups"
        parentOptions={groups.map((g) => ({ value: g.id, label: g.name }))}
        values={{ name: "", description: null, type: "MINISTRY", isPublic: true, parentGroupId: null }}
      />
    </>
  );
}
