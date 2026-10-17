import { PERMISSION_KEYS, PERMISSION_REQUIRES, type PermissionKey } from "@/constants/permissions";

export type Grants = { isSuper: boolean; permissions: readonly PermissionKey[] };

/** System Administrators hold every permission, including ones added later. */
export function can(grants: Grants, key: PermissionKey): boolean {
  return grants.isSuper || grants.permissions.includes(key);
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** Permissions in the set whose prerequisite is missing, e.g. manage_all without view_all. */
export function missingPrerequisites(keys: readonly PermissionKey[]): PermissionKey[] {
  return keys.filter((key) => {
    const required = PERMISSION_REQUIRES[key];
    return required !== undefined && !keys.includes(required);
  });
}

/** Own wallets need manage_own (or manage_all); anyone else's need manage_all. */
export function canManageWallet(grants: Grants, isOwner: boolean): boolean {
  return can(grants, "wallets.manage_all") || (isOwner && can(grants, "wallets.manage_own"));
}
