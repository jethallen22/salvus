import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteRole, saveRole } from "@/app/dashboard/roles/actions";
import { RoleForm } from "@/components/roles/role-form";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SectionLabel } from "@/components/ui/section-label";
import { PERMISSION_KEYS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth";
import { isPermissionKey } from "@/lib/permissions";
import type { Role } from "@/types/access";

export const metadata: Metadata = { title: "Edit role" };

const DELETE_ERRORS: Record<string, string> = {
  "in-use": "This role still has users. Move them to another role first.",
  locked: "Built-in roles can't be deleted.",
};

export default async function EditRolePage({ params, searchParams }: PageProps<"/dashboard/roles/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase, access } = await requirePermission("roles.manage");
  const { data: role } = await supabase
    .from("roles")
    .select("id, name, description, is_super, is_system, is_default, role_permissions(permission_key)")
    .eq("id", id)
    .maybeSingle<Role & { role_permissions: { permission_key: string }[] }>();
  if (!role) notFound();

  const { error } = await searchParams;
  const deleteError = typeof error === "string" ? DELETE_ERRORS[error] : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <SectionLabel>Edit role</SectionLabel>
      <h1 className="mb-12 text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">{role.name}</h1>

      {role.is_super ? (
        <Card accentTop className="p-8 text-center sm:p-10">
          <p className="small-caps text-accent">Full access</p>
          <p className="mt-3 text-lg">
            This role always has every permission, including any added in future, and can&rsquo;t be changed.
          </p>
        </Card>
      ) : (
        <>
          <RoleForm
            action={saveRole.bind(null, role.id)}
            initial={{
              name: role.name,
              description: role.description ?? "",
              permissions: role.role_permissions.map((p) => p.permission_key).filter(isPermissionKey),
            }}
            grantable={access.isSuper ? PERMISSION_KEYS : access.permissions.slice()}
            submitLabel="Save role"
          />
          {role.is_system && <p className="mt-4 text-sm text-muted-foreground">Built-in role: its name is fixed and it can&rsquo;t be deleted.</p>}
        </>
      )}

      {!role.is_system && (
        <div className="mt-16 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Deleting a role is only possible when no user has it.</p>
          <form action={deleteRole.bind(null, role.id)}>
            <ConfirmButton variant="danger" message={`Delete the role “${role.name}”? This can't be undone.`}>
              Delete role
            </ConfirmButton>
          </form>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {deleteError}
        </p>
      )}
    </div>
  );
}
