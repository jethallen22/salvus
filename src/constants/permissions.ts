// Mirrors public.permissions in supabase/migrations/*_rbac.sql (a unit test keeps them in sync).
export const PERMISSIONS = {
  "wallets.manage_own": {
    group: "Wallets",
    label: "Manage own wallets",
    description: "Create, edit, deactivate and delete their own wallets",
  },
  "wallets.view_all": {
    group: "Wallets",
    label: "View all wallets",
    description: "See every wallet and who owns it",
  },
  "wallets.manage_all": {
    group: "Wallets",
    label: "Manage all wallets",
    description: "Edit, deactivate, relink or delete any wallet, and create wallets for other users",
  },
  "users.manage": {
    group: "Administration",
    label: "Manage users",
    description: "Create, edit, deactivate and delete users, reset passwords, assign roles",
  },
  "roles.manage": {
    group: "Administration",
    label: "Manage roles",
    description: "Create, edit and delete roles and choose their permissions",
  },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as [PermissionKey, ...PermissionKey[]];

/** A permission that only makes sense together with another one. */
export const PERMISSION_REQUIRES: Partial<Record<PermissionKey, PermissionKey>> = {
  "wallets.manage_all": "wallets.view_all",
};
