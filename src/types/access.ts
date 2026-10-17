import type { PermissionKey } from "@/constants/permissions";
import type { Grants } from "@/lib/permissions";

/** The signed-in user's identity, role and permissions, loaded from the database per request. */
export type Access = Grants & {
  userId: string;
  email: string;
  username: string;
  fullName: string;
  roleName: string;
  mustChangePassword: boolean;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  is_super: boolean;
  is_system: boolean;
  is_default: boolean;
};

export type RoleWithPermissions = Role & { permissions: PermissionKey[] };

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  role: Pick<Role, "id" | "name" | "is_super">;
};
