import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { requirePermission } from "@/lib/auth";
import { fullName } from "@/lib/format";
import type { UserProfile } from "@/types/access";

export const metadata: Metadata = { title: "Users" };

function status(user: UserProfile) {
  if (!user.is_active) return { label: "Deactivated", tone: "text-destructive" };
  if (user.must_change_password) return { label: "Temporary password", tone: "text-muted-foreground" };
  return { label: "Active", tone: "text-accent" };
}

export default async function UsersPage() {
  const { supabase, access } = await requirePermission("users.manage");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, first_name, middle_name, last_name, is_active, must_change_password, created_at, role:roles(id, name, is_super)")
    .order("created_at")
    .returns<UserProfile[]>();
  const users = data ?? [];

  return (
    <>
      <SectionLabel>Users</SectionLabel>
      <div className="mb-16 flex flex-col items-center gap-6 text-center">
        <h1 className="text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-6xl">Users</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Only administrators create accounts. Each person signs in with the email you set here.
        </p>
        <Link href="/dashboard/users/new" className={buttonClasses("primary")}>
          New user
        </Link>
      </div>

      {error && <p className="text-center text-destructive">Couldn&rsquo;t load users. Please refresh.</p>}

      <ul className="border-t border-border">
        {users.map((user) => {
          const { label, tone } = status(user);
          return (
            <li key={user.id} className="border-b border-border">
              <Link
                href={`/dashboard/users/${user.id}/edit`}
                className="group grid gap-1 py-5 transition-colors duration-200 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[1.3fr_0.7fr_0.6fr] sm:items-center sm:gap-6 sm:px-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-lg">
                    {fullName(user) || user.username}
                    {user.id === access.userId && <span className="small-caps ml-2 text-[0.625rem] text-muted-foreground">You</span>}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {fullName(user) && (
                      <>
                        <span className="font-mono">{user.username}</span> ·{" "}
                      </>
                    )}
                    {user.email}
                  </span>
                </span>
                <span className="text-sm">{user.role.name}</span>
                <span className={`small-caps sm:text-right ${tone}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
