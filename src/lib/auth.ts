import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { LOGIN_THROTTLED_PREFIX } from "./auth-messages";
import { prisma } from "./db";
import { checkThrottle, clearAttempts, loginKeys, loginRules, minutesLabel, recordAttempt } from "./rate-limit";
import { clientIp } from "./request-meta";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

let dummyHash: string | undefined;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const ip = clientIp(req?.headers);
        const email = parsed.data.email;
        const throttle = await checkThrottle(loginRules(email, ip));
        if (!throttle.allowed) {
          // Message is shown on the sign-in form (see LOGIN_THROTTLED_PREFIX).
          throw new Error(`${LOGIN_THROTTLED_PREFIX}${minutesLabel(throttle.retryAfterMs)}`);
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { organization: { select: { name: true } } },
        });
        if (!user || user.disabledAt) {
          // Spend similar time as a real check to avoid user enumeration.
          dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
          await bcrypt.compare(parsed.data.password, dummyHash);
          await recordAttempt(loginKeys(email, ip));
          return null;
        }
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          await recordAttempt(loginKeys(email, ip));
          return null;
        }

        // Success clears this person's own counters (not the IP-wide one).
        await clearAttempts(loginKeys(email, ip).slice(0, 2));
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.role = user.role;
        // Fixed at sign-in (unlike `iat`, which is refreshed on every request),
        // so requireTenant() can reject sessions older than a password change.
        token.authTime = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid;
      session.user.organizationId = token.organizationId;
      session.user.organizationName = token.organizationName;
      session.user.role = token.role;
      session.user.authTime = token.authTime;
      return session;
    },
  },
};
