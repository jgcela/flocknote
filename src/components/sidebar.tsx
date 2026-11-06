"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "./logo";
import { GivingIcon, GroupsIcon, HomeIcon, MessagesIcon, PeopleIcon, TeamIcon } from "./nav-icons";

const NAV = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/people", label: "People & Households", Icon: PeopleIcon },
  { href: "/groups", label: "Groups", Icon: GroupsIcon },
  { href: "/messages", label: "Messages", Icon: MessagesIcon },
  { href: "/giving", label: "Giving", Icon: GivingIcon },
];

const MANAGER_NAV = [{ href: "/settings/team", label: "Settings", Icon: TeamIcon }];

export function Sidebar({ churchName, userName, canManageTeam }: { churchName: string; userName: string; canManageTeam: boolean }) {
  const pathname = usePathname();
  const items = canManageTeam ? [...NAV, ...MANAGER_NAV] : NAV;

  return (
    <aside className="border-b-2 border-cream-300 bg-cream-50 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r-2">
      <div className="flex items-center justify-between px-5 py-5 lg:block">
        <Link href="/dashboard" className="no-underline" aria-label="Go to home">
          <Logo subtitle={churchName} />
        </Link>
        <button type="button" className="btn-secondary lg:hidden" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </button>
      </div>

      <nav aria-label="Main" className="overflow-x-auto px-3 pb-3 lg:flex-1 lg:pb-0">
        <ul className="flex gap-1 lg:flex-col">
          {items.map(({ href, label, Icon }) => {
            const section = href.startsWith("/settings") ? "/settings" : href;
            const active = pathname === section || pathname.startsWith(`${section}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex min-h-12 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-base font-semibold no-underline transition-colors",
                    active
                      ? "bg-clay-600 text-white"
                      : "text-bark-900 hover:bg-cream-200",
                  ].join(" ")}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden border-t-2 border-cream-300 px-5 py-4 lg:block">
        <p className="text-sm text-bark-700">Signed in as</p>
        <p className="mb-3 font-semibold">{userName}</p>
        <button type="button" className="btn-secondary w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
