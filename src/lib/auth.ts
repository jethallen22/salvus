import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { fullName } from "@/lib/format";
import type { PermissionKey } from "@/constants/permissions";
import { can, isPermissionKey } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Access } from "@/types/access";

type ProfileRow = {
  email: string;
  username: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  is_active: boolean;
  must_change_password: boolean;
  role: { name: string; is_super: boolean; role_permissions: { permission_key: string }[] } | null;
};

// One verified session + profile lookup per request, shared by layout, page and actions.
const loadSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  // Role and permissions come from the database, never from JWT claims, so changes and
  // deactivation apply on the very next request.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, username, first_name, middle_name, last_name, is_active, must_change_password, role:roles(name, is_super, role_permissions(permission_key))")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  return { supabase, userId, profile };
});

/**
 * Verified, active current user (or a redirect), plus a Supabase client acting as them.
 * Users still on an admin-set temporary password are sent to change it first.
 */
export async function requireUser({ allowPasswordChange = false } = {}) {
  const session = await loadSession();
  if (!session) redirect("/login");

  const { supabase, userId, profile } = session;
  if (!profile?.role || !profile.is_active) redirect("/auth/signout?reason=inactive");
  if (profile.must_change_password && !allowPasswordChange) redirect("/dashboard/account");

  const access: Access = {
    userId,
    email: profile.email,
    username: profile.username,
    fullName: fullName(profile),
    roleName: profile.role.name,
    isSuper: profile.role.is_super,
    mustChangePassword: profile.must_change_password,
    permissions: profile.role.role_permissions.map((p) => p.permission_key).filter(isPermissionKey),
  };

  return { supabase, user: { id: userId, email: profile.email }, access };
}

/** requireUser() plus at least one of the given permissions; otherwise back to the dashboard. */
export async function requirePermission(...keys: PermissionKey[]) {
  const context = await requireUser();
  if (!keys.some((key) => can(context.access, key))) redirect("/dashboard");
  return context;
}
