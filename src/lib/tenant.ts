import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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
    where: { id: session.user.id, organizationId: session.user.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!user) redirect("/login");

  return {
    user,
    organization: user.organization,
    db: tenantDb(user.organization.id),
  };
});
