"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { parseRoleForm } from "@/lib/validation/role";

export type RoleFormState = { errors?: Record<string, string> };

// Postgres error codes raised by the RBAC migration's constraints, policies and triggers.
const ROLE_ERRORS: Record<string, string> = {
  "23505": "A role with that name already exists",
  "42501": "You can only grant permissions you have yourself",
  "23514": "Built-in roles can't be renamed, and the System Administrator role can't be changed",
};

/** Create (id = null) or update a role. Runs under the caller's RLS via the save_role() function. */
export async function saveRole(id: string | null, _prev: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const { supabase, access } = await requirePermission("roles.manage");
  if (id !== null && !z.uuid().safeParse(id).success) redirect("/dashboard/roles");

  const parsed = parseRoleForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const { name, description, permissions } = parsed.role;

  // Friendly version of the database rule: new grants must be permissions the editor holds.
  let current: string[] = [];
  if (id) {
    const { data } = await supabase.from("role_permissions").select("permission_key").eq("role_id", id);
    current = (data ?? []).map((row) => row.permission_key as string);
  }
  const notHeld = permissions.find((key) => !current.includes(key) && !can(access, key));
  if (notHeld) return { errors: { permissions: `You can't grant “${PERMISSIONS[notHeld].label}” because you don't have it` } };

  const { error } = await supabase.rpc("save_role", {
    p_id: id,
    p_name: name,
    p_description: description,
    p_permissions: permissions,
  });
  if (error) return { errors: { form: ROLE_ERRORS[error.code] ?? "Couldn't save the role. Please try again." } };

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/roles");
}

export async function deleteRole(id: string) {
  const { supabase } = await requirePermission("roles.manage");
  if (!z.uuid().safeParse(id).success) redirect("/dashboard/roles");

  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error?.code === "23503") redirect(`/dashboard/roles/${id}/edit?error=in-use`);
  if (error) redirect(`/dashboard/roles/${id}/edit?error=locked`);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/roles");
}
