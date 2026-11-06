import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationName: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    organizationId: string;
    organizationName: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    organizationId: string;
    organizationName: string;
    role: UserRole;
  }
}
