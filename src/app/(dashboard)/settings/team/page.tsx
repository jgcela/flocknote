import type { Metadata } from "next";
import { ConfirmButton } from "@/components/form";
import { Badge, PageHeader, SubNav } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { requireTeamManager } from "@/lib/tenant";
import { SETTINGS_NAV } from "../nav";
import { changeRole, inviteUser, revokeInvitation, setAccess } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { db, user: me } = await requireTeamManager();
  const now = new Date();
  const [users, invitations] = await Promise.all([
    db.user.findMany({ orderBy: [{ disabledAt: { sort: "asc", nulls: "first" } }, { name: "asc" }] }),
    db.userInvitation.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="People who can sign in and manage your church's information." />
      <SubNav items={SETTINGS_NAV} current="/settings/team" />

      <section className="card mb-6 overflow-x-auto" aria-labelledby="team-heading">
        <h2 id="team-heading" className="px-6 pt-6 text-2xl font-bold">Who has access</h2>
        <table className="data-table mt-4">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Last sign-in</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editable = u.id !== me.id && u.role !== "OWNER";
              return (
                <tr key={u.id}>
                  <td>
                    <div className="font-semibold">{u.name}{u.id === me.id ? " (you)" : ""}</div>
                    <div className="break-all text-sm text-bark-700">{u.email}</div>
                  </td>
                  <td className="space-x-1">
                    <Badge tone={u.role === "STAFF" ? "neutral" : "warm"}>{u.role === "ADMIN" ? "Administrator" : titleCase(u.role)}</Badge>
                    {u.disabledAt ? <Badge>No access</Badge> : null}
                  </td>
                  <td>{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                  <td className="text-right">
                    {editable ? (
                      <span className="inline-flex flex-wrap justify-end gap-2">
                        {!u.disabledAt ? (
                          <ConfirmButton
                            action={changeRole.bind(null, u.id, u.role === "ADMIN" ? "STAFF" : "ADMIN")}
                            label={u.role === "ADMIN" ? "Make staff" : "Make administrator"}
                            confirmText={u.role === "ADMIN" ? `Make ${u.name} staff? They will no longer manage the team.` : `Make ${u.name} an administrator? They will be able to invite and remove people.`}
                            className="btn-secondary min-h-10 px-4 py-1.5"
                          />
                        ) : null}
                        <ConfirmButton
                          action={setAccess.bind(null, u.id, Boolean(u.disabledAt))}
                          label={u.disabledAt ? "Restore access" : "Remove access"}
                          confirmText={u.disabledAt ? `Let ${u.name} sign in again?` : `Remove ${u.name}'s access? They will be signed out right away. Messages they sent stay in the log.`}
                          className="btn-secondary min-h-10 px-4 py-1.5"
                        />
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {invitations.length > 0 ? (
        <section className="card mb-6 overflow-x-auto" aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="px-6 pt-6 text-2xl font-bold">Waiting to accept</h2>
          <table className="data-table mt-4">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Invited</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="break-all font-semibold">{inv.email}</div>
                    {inv.name ? <div className="text-sm text-bark-700">{inv.name}</div> : null}
                  </td>
                  <td>{inv.role === "ADMIN" ? "Administrator" : "Staff"}</td>
                  <td>
                    {formatDate(inv.createdAt)}
                    {inv.invitedBy ? <div className="text-sm text-bark-700">by {inv.invitedBy.name} · expires {formatDate(inv.expiresAt)}</div> : null}
                  </td>
                  <td className="text-right">
                    <ConfirmButton
                      action={revokeInvitation.bind(null, inv.id)}
                      label="Cancel invitation"
                      confirmText={`Cancel the invitation for ${inv.email}? The link will stop working.`}
                      className="btn-secondary min-h-10 px-4 py-1.5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="card p-6" aria-labelledby="invite-heading">
        <h2 id="invite-heading" className="mb-1 text-2xl font-bold">Invite someone</h2>
        <p className="mb-5 text-bark-700">They&apos;ll get an email with a link to choose their password. The link works for 7 days.</p>
        <InviteForm action={inviteUser} />
      </section>
    </>
  );
}
