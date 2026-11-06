/** Best-effort client IP from proxy headers ("unknown" if absent). */
export function clientIp(headers: { get(name: string): string | null | undefined } | Record<string, unknown> | undefined) {
  if (!headers) return "unknown";
  const get = (name: string): string | undefined => {
    if (typeof (headers as { get?: unknown }).get === "function") {
      return (headers as { get(n: string): string | null | undefined }).get(name) ?? undefined;
    }
    const v = (headers as Record<string, unknown>)[name];
    return Array.isArray(v) ? String(v[0]) : typeof v === "string" ? v : undefined;
  };
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || get("x-real-ip")?.trim() || "unknown";
}

/**
 * Absolute base URL for links in emails. Uses APP_URL or NEXTAUTH_URL; never
 * the request's Host header, which an attacker could spoof to steal tokens.
 */
export function appUrl(path = "") {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!base) throw new Error("Set APP_URL (or NEXTAUTH_URL) so emailed links point at your site.");
  return new URL(path.replace(/^\/+/, ""), base.endsWith("/") ? base : `${base}/`).toString();
}
