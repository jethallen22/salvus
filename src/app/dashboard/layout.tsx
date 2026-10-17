import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/dashboard/nav-link";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import type { PermissionKey } from "@/constants/permissions";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

type NavItem = { href: string; label: string; permission?: PermissionKey };

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Wallets",
    items: [
      { href: "/dashboard", label: "My wallets" },
      { href: "/dashboard/all-wallets", label: "All wallets", permission: "wallets.view_all" },
    ],
  },
  {
    heading: "Administration",
    items: [
      { href: "/dashboard/users", label: "Users", permission: "users.manage" },
      { href: "/dashboard/roles", label: "Roles", permission: "roles.manage" },
    ],
  },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Pages re-check on their own; this only decides which links to show.
  const { access } = await requireUser({ allowPasswordChange: true });
  const groups = access.mustChangePassword
    ? []
    : NAV.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || can(access, item.permission)) })).filter(
        (group) => group.items.length > 0,
      );

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <Sidebar>
        <div className="px-6 pt-6 pb-10">
          <Link href="/dashboard" aria-label="Salvus dashboard" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
            <Logo horizontal className="w-36" />
          </Link>
        </div>

        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3">
          {groups.map((group) => (
            <div key={group.heading} className="mb-8">
              <p className="small-caps mb-2 px-3 text-[0.625rem] text-muted-foreground">{group.heading}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink href={item.href}>{item.label}</NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-3 pt-3 pb-4">
          <NavLink href="/dashboard/account">
            <span className="flex min-w-0 flex-col py-2 leading-tight">
              <span className="sr-only">Account: </span>
              <span className="truncate font-serif text-base tracking-normal">{access.fullName || access.username}</span>
              <span className="small-caps mt-1 truncate text-[0.625rem] text-muted-foreground">{access.roleName}</span>
            </span>
          </NavLink>
          <form action={signOut} className="mt-1 px-1">
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </Sidebar>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 animate-fade-in sm:px-8 sm:py-24">{children}</main>
    </div>
  );
}
