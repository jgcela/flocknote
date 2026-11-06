import "server-only";
import { prisma } from "./db";
import { hashToken } from "./tokens";

// Lookups for emailed links. Kept out of the "use server" actions file so they
// can't be called from the browser.

export async function findValidResetToken(token: string) {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, disabledAt: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.user.disabledAt) return null;
  return row;
}

export async function findValidInvitation(token: string) {
  const invite = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return null;
  return invite;
}
