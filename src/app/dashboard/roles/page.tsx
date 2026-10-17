import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { Role } from "@/types/access";

export const metadata: Metadata = { title: "Roles" };

type RoleRow = Role & { role_permissions: { permission_key: string }[]; profiles?: { count: number }[] };

export default async function RolesPage() {
  const { supabase, access } = await requirePermission("roles.manage");
  // User counts need permission to see other users' profiles.
  const showUsers = can(access, "users.manage");
  const { data, error } = await supabase
    .from("roles")
    .select(`id, name, description, is_super, is_system, is_default, role_permissions(permission_key)${showUsers ? ", profiles(count)" : ""}`)
    .order("is_super", { ascending: false })
    .order("is_system", { ascending: false })
    .order("name")
    .returns<RoleRow[]>();
  const roles = data ?? [];

  return (
    <>
      <SectionLabel>Roles</SectionLabel>
      <div className="mb-16 flex flex-col items-center gap-6 text-center">
        <h1 className="text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-6xl">Roles &amp; permissions</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          A role is a named set of permissions. Every user has exactly one.
        </p>
        <Link href="/dashboard/roles/new" className={buttonClasses("primary")}>
          New role
        </Link>
      </div>

      {error && <p className="text-center text-destructive">Couldn&rsquo;t load roles. Please refresh.</p>}

      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const users = role.profiles?.[0]?.count;
          return (
            <li key={role.id}>
              <Link
                href={`/dashboard/roles/${role.id}/edit`}
                className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card accentTop hoverEffect className="flex h-full flex-col p-8">
                  <p className="small-caps text-accent">
                    {role.is_super ? "Full access" : role.is_default ? "Default for new users" : role.is_system ? "Built-in" : "Custom"}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold leading-snug">{role.name}</h2>
                  {role.description && <p className="mt-1 text-muted-foreground">{role.description}</p>}
                  <p className="mt-auto pt-6 text-sm text-muted-foreground">
                    {role.is_super ? "All permissions" : `${role.role_permissions.length} permission${role.role_permissions.length === 1 ? "" : "s"}`}
                    {users !== undefined && ` · ${users} user${users === 1 ? "" : "s"}`}
                  </p>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
