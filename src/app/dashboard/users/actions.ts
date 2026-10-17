"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { LOGO_BUCKET, PHOTO_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, fieldErrors, resetPasswordSchema, updateUserSchema } from "@/lib/validation/user";
import type { Access } from "@/types/access";

export type UserFormState = {
  errors?: Record<string, string>;
  saved?: boolean;
  /** Echoed once so the admin can hand the temporary password over. */
  created?: { id: string; username: string; email: string; password: string };
  reset?: { password: string };
};

const BAN_FOREVER = "876000h"; // ~100 years: Supabase's way to block sign-in until lifted
const SUPER_ONLY = "Only a System Administrator can change a System Administrator";
const LAST_ADMIN = "At least one active System Administrator is required";
const USERNAME_TAKEN = "That username is taken";

type Target = { id: string; email: string; is_active: boolean; role: { id: string; is_super: boolean } };

// Every action re-checks users.manage from the database before using the secret-key client.
async function managerContext() {
  const context = await requirePermission("users.manage");
  return { ...context, admin: createAdminClient() };
}

async function loadTarget(admin: ReturnType<typeof createAdminClient>, id: string): Promise<Target | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await admin
    .from("profiles")
    .select("id, email, is_active, role:roles(id, is_super)")
    .eq("id", id)
    .maybeSingle<Target>();
  return data;
}

async function usernameTaken(admin: ReturnType<typeof createAdminClient>, username: string, exceptId?: string) {
  const { data } = await admin.from("profiles").select("id").eq("username", username).maybeSingle<{ id: string }>();
  return Boolean(data && data.id !== exceptId);
}

async function roleIsSuper(admin: ReturnType<typeof createAdminClient>, roleId: string): Promise<boolean | null> {
  const { data } = await admin.from("roles").select("is_super").eq("id", roleId).maybeSingle<{ is_super: boolean }>();
  return data ? data.is_super : null;
}

/** Rules 1 and 4: admins are only managed by admins, and nobody locks themselves out here. */
function guard(access: Access, target: Target, { allowSelf = false } = {}): string | null {
  if (!allowSelf && target.id === access.userId) return "Use your Account page to manage your own account";
  if (target.role.is_super && !access.isSuper) return SUPER_ONLY;
  return null;
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const { access, admin } = await managerContext();
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { first_name, middle_name, last_name, username, email, role_id, password } = parsed.data;

  const isSuper = await roleIsSuper(admin, role_id);
  if (isSuper === null) return { errors: { role_id: "Choose a role" } };
  if (isSuper && !access.isSuper) return { errors: { role_id: SUPER_ONLY } };
  if (await usernameTaken(admin, username)) return { errors: { username: USERNAME_TAKEN } };

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error?.code === "email_exists") return { errors: { email: "A user with this email already exists" } };
  if (error?.code === "weak_password") return { errors: { password: "Choose a stronger password" } };
  if (error || !data.user) return { errors: { form: "Couldn't create the user. Please try again." } };

  // The auth trigger made a default profile; now set the real names, username, role and first-login rule.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_name, middle_name: middle_name ?? null, last_name, username, role_id, must_change_password: true })
    .eq("id", data.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    // 23505: someone took the username between the check above and now.
    return { errors: profileError.code === "23505" ? { username: USERNAME_TAKEN } : { form: "Couldn't create the user. Please try again." } };
  }

  revalidatePath("/dashboard/users");
  return { created: { id: data.user.id, username, email, password } };
}

export async function updateUser(id: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const { access, admin } = await managerContext();
  const target = await loadTarget(admin, id);
  if (!target) redirect("/dashboard/users");

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { first_name, middle_name, last_name, username, email, role_id } = parsed.data;

  const roleChanged = role_id !== target.role.id;
  const denied = guard(access, target, { allowSelf: !roleChanged });
  if (denied) return { errors: { [roleChanged ? "role_id" : "form"]: denied } };

  const newRoleIsSuper = await roleIsSuper(admin, role_id);
  if (newRoleIsSuper === null) return { errors: { role_id: "Choose a role" } };
  if (newRoleIsSuper && !access.isSuper) return { errors: { role_id: SUPER_ONLY } };

  const { error } = await admin.from("profiles").update({ first_name, middle_name: middle_name ?? null, last_name, username, role_id }).eq("id", id);
  if (error?.code === "23505") return { errors: { username: USERNAME_TAKEN } };
  if (error?.code === "23514") return { errors: { role_id: LAST_ADMIN } };
  if (error) return { errors: { form: "Couldn't save the user. Please try again." } };

  if (email !== target.email) {
    // The profile's email follows automatically via the auth.users trigger.
    const { error: emailError } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
    if (emailError?.code === "email_exists") return { errors: { email: "A user with this email already exists" } };
    if (emailError) return { errors: { email: "Couldn't change the email. Please try again." } };
  }

  revalidatePath("/dashboard", "layout");
  return { saved: true };
}

export async function resetUserPassword(id: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const { access, admin } = await managerContext();
  const target = await loadTarget(admin, id);
  if (!target) redirect("/dashboard/users");
  const denied = guard(access, target);
  if (denied) return { errors: { password: denied } };

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { error } = await admin.auth.admin.updateUserById(id, { password: parsed.data.password });
  if (error) return { errors: { password: error.code === "weak_password" ? "Choose a stronger password" : "Couldn't reset the password." } };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", id);

  revalidatePath("/dashboard/users");
  return { reset: { password: parsed.data.password } };
}

export async function setUserActive(id: string, active: boolean) {
  const { access, admin } = await managerContext();
  const target = await loadTarget(admin, id);
  if (!target) redirect("/dashboard/users");
  if (guard(access, target)) redirect(`/dashboard/users/${id}/edit?error=forbidden`);

  if (active) {
    await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
    await admin.from("profiles").update({ is_active: true }).eq("id", id);
  } else {
    // Profile first: the database refuses to switch off the last System Administrator.
    const { error } = await admin.from("profiles").update({ is_active: false }).eq("id", id);
    if (error) redirect(`/dashboard/users/${id}/edit?error=${error.code === "23514" ? "last-admin" : "failed"}`);
    await admin.auth.admin.updateUserById(id, { ban_duration: BAN_FOREVER });
  }

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/users/${id}/edit`);
}

export async function deleteUser(id: string) {
  const { access, admin } = await managerContext();
  const target = await loadTarget(admin, id);
  if (!target) redirect("/dashboard/users");
  if (guard(access, target)) redirect(`/dashboard/users/${id}/edit?error=forbidden`);

  // Their wallets go with them (cascade); collect their image files first, delete after.
  const files: { bucket: string; paths: string[] }[] = [];
  for (const bucket of [LOGO_BUCKET, PHOTO_BUCKET]) {
    const { data } = await admin.storage.from(bucket).list(id, { limit: 1000 });
    files.push({ bucket, paths: (data ?? []).map((file) => `${id}/${file.name}`) });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) redirect(`/dashboard/users/${id}/edit?error=${target.role.is_super ? "last-admin" : "failed"}`);

  for (const { bucket, paths } of files) {
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/users");
}
