import "server-only";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { tenantDb } from "./tenant-db";

/**
 * Resolve the signed-in staff user and a database client scoped to their
 * church. Re-checks the database on each request so a removed account (or one
 * moved to another church) loses access immediately, not when its JWT expires.
 */
export const requireTenant = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) redirect("/login");

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, organizationId: session.user.organizationId, disabledAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordChangedAt: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!user) redirect("/login");

  // After a password reset, sessions that signed in earlier stop working.
  if (user.passwordChangedAt) {
    const authTime = session.user.authTime ?? 0;
    if (authTime < Math.floor(user.passwordChangedAt.getTime() / 1000)) redirect("/login?expired=1");
  }

  return {
    user,
    organization: user.organization,
    db: tenantDb(user.organization.id),
  };
});

/** Roles allowed to manage the team (invite, change roles, remove). */
export const TEAM_MANAGER_ROLES = ["OWNER", "ADMIN"] as const;

export function canManageTeam(role: UserRole) {
  return (TEAM_MANAGER_ROLES as readonly UserRole[]).includes(role);
}

/** requireTenant() plus a role check; non-managers get a 404. */
export async function requireTeamManager() {
  const ctx = await requireTenant();
  if (!canManageTeam(ctx.user.role)) notFound();
  return ctx;
}
