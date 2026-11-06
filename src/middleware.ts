export { default } from "next-auth/middleware";

// Every admin route requires a session. Tenant scoping itself happens on the
// server in requireTenant(), which also re-validates the user against the DB.
export const config = {
  matcher: ["/dashboard/:path*", "/people/:path*", "/groups/:path*", "/messages/:path*", "/giving/:path*"],
};
