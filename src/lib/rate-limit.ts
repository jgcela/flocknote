import { prisma } from "./db";

/**
 * Sliding-window limits backed by the AuthThrottle table. Each failed attempt
 * is one row; a key is blocked while it has `max` rows inside `windowMs`.
 */
export type ThrottleRule = { key: string; max: number; windowMs: number };

export type ThrottleResult = { allowed: true } | { allowed: false; retryAfterMs: number };

const DAY_MS = 24 * 60 * 60 * 1000;

export async function checkThrottle(rules: ThrottleRule[]): Promise<ThrottleResult> {
  const now = Date.now();
  let retryAfterMs = 0;
  for (const rule of rules) {
    const since = new Date(now - rule.windowMs);
    const hits = await prisma.authThrottle.findMany({
      where: { key: rule.key, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: rule.max,
      select: { createdAt: true },
    });
    if (hits.length >= rule.max) {
      // Blocked until the oldest counted attempt leaves the window.
      const oldest = hits[hits.length - 1]!.createdAt.getTime();
      retryAfterMs = Math.max(retryAfterMs, oldest + rule.windowMs - now);
    }
  }
  return retryAfterMs > 0 ? { allowed: false, retryAfterMs } : { allowed: true };
}

export async function recordAttempt(keys: string[]) {
  await prisma.authThrottle.createMany({ data: keys.map((key) => ({ key })) });
  // Opportunistic cleanup so the table stays small without a cron job.
  if (Math.random() < 0.05) {
    await prisma.authThrottle.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - DAY_MS) } } });
  }
}

export async function clearAttempts(keys: string[]) {
  await prisma.authThrottle.deleteMany({ where: { key: { in: keys } } });
}

export function minutesLabel(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

// ── Policies ──

const MINUTE = 60_000;

/**
 * Sign-in: 5 failures per email+IP in 15 min stops guessing from one place;
 * 20 per email per hour stops distributed guessing on one account; 50 per IP
 * per hour stops one machine spraying many accounts. The per-pair limit is the
 * tightest so an attacker elsewhere can't easily lock a real user out.
 */
export function loginRules(email: string, ip: string): ThrottleRule[] {
  return [
    { key: `login:pair:${email}|${ip}`, max: 5, windowMs: 15 * MINUTE },
    { key: `login:email:${email}`, max: 20, windowMs: 60 * MINUTE },
    { key: `login:ip:${ip}`, max: 50, windowMs: 60 * MINUTE },
  ];
}

export function loginKeys(email: string, ip: string) {
  return loginRules(email, ip).map((r) => r.key);
}

/** Password-reset emails: 3 per address and 10 per IP each hour. */
export function resetRequestRules(email: string, ip: string): ThrottleRule[] {
  return [
    { key: `reset:email:${email}`, max: 3, windowMs: 60 * MINUTE },
    { key: `reset:ip:${ip}`, max: 10, windowMs: 60 * MINUTE },
  ];
}

/** New churches: 5 per IP per hour, to slow automated sign-ups. */
export function signupRules(ip: string): ThrottleRule[] {
  return [{ key: `signup:ip:${ip}`, max: 5, windowMs: 60 * MINUTE }];
}

/** After a password reset: forget failed sign-ins for this address. */
export async function clearLoginAttemptsForEmail(email: string) {
  await prisma.authThrottle.deleteMany({
    where: { OR: [{ key: `login:email:${email}` }, { key: { startsWith: `login:pair:${email}|` } }] },
  });
}
