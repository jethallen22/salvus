import type { Metadata } from "next";
import { createUser } from "@/app/dashboard/users/actions";
import { SectionLabel } from "@/components/ui/section-label";
import { UserForm } from "@/components/users/user-form";
import { requirePermission } from "@/lib/auth";
import type { Role } from "@/types/access";

export const metadata: Metadata = { title: "New user" };

export default async function NewUserPage() {
  const { supabase, access } = await requirePermission("users.manage");
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, is_super, is_default")
    .order("name")
    .returns<Pick<Role, "id" | "name" | "is_super" | "is_default">[]>();
  const defaultRole = roles?.find((role) => role.is_default);

  return (
    <div className="mx-auto max-w-xl">
      <SectionLabel>New user</SectionLabel>
      <h1 className="mb-4 text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">Create a user</h1>
      <p className="mb-12 text-center text-lg text-muted-foreground">
        Set a temporary password and pass it on. They&rsquo;ll replace it the first time they sign in.
      </p>
      <UserForm
        mode="create"
        action={createUser}
        roles={roles ?? []}
        initial={{ first_name: "", middle_name: "", last_name: "", username: "", email: "", role_id: defaultRole?.id ?? "" }}
        canAssignSuper={access.isSuper}
      />
    </div>
  );
}
