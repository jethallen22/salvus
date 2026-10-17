import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERMISSION_KEYS } from "@/constants/permissions";
import { generatePassword, PASSWORD_ALPHABET } from "@/lib/generate-password";
import { can, canManageWallet, missingPrerequisites } from "@/lib/permissions";
import { parseRoleForm } from "@/lib/validation/role";
import { changePasswordSchema, createUserSchema, normalizeUsername, updateUserSchema, USERNAME_PATTERN } from "@/lib/validation/user";

const owner = { isSuper: false, permissions: ["wallets.manage_own"] } as const;
const auditor = { isSuper: false, permissions: ["wallets.view_all"] } as const;
const walletAdmin = { isSuper: false, permissions: ["wallets.view_all", "wallets.manage_all"] } as const;
const superAdmin = { isSuper: true, permissions: [] } as const;

function roleForm(fields: { name?: string; description?: string; permissions?: string[] }) {
  const data = new FormData();
  data.set("name", fields.name ?? "Auditor");
  data.set("description", fields.description ?? "");
  for (const key of fields.permissions ?? []) data.append("permissions", key);
  return data;
}

describe("permission checks", () => {
  it("gives System Administrators every permission", () => {
    for (const key of PERMISSION_KEYS) expect(can(superAdmin, key)).toBe(true);
  });

  it("limits other roles to their own grants", () => {
    expect(can(owner, "wallets.manage_own")).toBe(true);
    expect(can(owner, "users.manage")).toBe(false);
  });

  it("lets owners manage only their own wallets unless they hold manage_all", () => {
    expect(canManageWallet(owner, true)).toBe(true);
    expect(canManageWallet(owner, false)).toBe(false);
    expect(canManageWallet(auditor, false)).toBe(false);
    expect(canManageWallet(auditor, true)).toBe(false);
    expect(canManageWallet(walletAdmin, false)).toBe(true);
    expect(canManageWallet(superAdmin, false)).toBe(true);
  });

  it("flags manage_all without view_all", () => {
    expect(missingPrerequisites(["wallets.manage_all"])).toEqual(["wallets.manage_all"]);
    expect(missingPrerequisites(["wallets.manage_all", "wallets.view_all"])).toEqual([]);
  });
});

describe("role form", () => {
  it("accepts a valid role and de-duplicates permissions", () => {
    const result = parseRoleForm(roleForm({ permissions: ["wallets.view_all", "wallets.view_all"] }));
    expect(result.ok && result.role.permissions).toEqual(["wallets.view_all"]);
  });

  it("rejects unknown permissions and missing prerequisites", () => {
    expect(parseRoleForm(roleForm({ permissions: ["wallets.everything"] })).ok).toBe(false);
    const result = parseRoleForm(roleForm({ permissions: ["wallets.manage_all"] }));
    expect(!result.ok && result.errors.permissions).toMatch(/View all wallets/);
  });

  it("requires a sensible name", () => {
    expect(parseRoleForm(roleForm({ name: " x " })).ok).toBe(false);
  });
});

describe("users and passwords", () => {
  it("generates long, unambiguous, random passwords", () => {
    const a = generatePassword();
    expect(a).toHaveLength(14);
    expect([...a].every((ch) => PASSWORD_ALPHABET.includes(ch))).toBe(true);
    expect(generatePassword()).not.toBe(a);
  });

  it("validates new accounts", () => {
    const valid = { first_name: "Ana", middle_name: "", last_name: "Cruz", username: "ana.cruz", email: "ana@example.test", role_id: "11111111-2222-4333-8444-555555555555", password: "temporary1" };
    expect(createUserSchema.safeParse(valid).success).toBe(true);
    expect(createUserSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, role_id: "admin" }).success).toBe(false);
  });

  it("requires first and last names, but not a middle name", () => {
    const base = { username: "ana.cruz", email: "ana@example.test", role_id: "11111111-2222-4333-8444-555555555555" };
    const ok = updateUserSchema.safeParse({ ...base, first_name: " Ana ", middle_name: "  ", last_name: "Cruz" });
    expect(ok.success && ok.data).toMatchObject({ first_name: "Ana", last_name: "Cruz", middle_name: undefined });
    expect(updateUserSchema.safeParse({ ...base, first_name: "", last_name: "Cruz" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ ...base, first_name: "Ana", last_name: "   " }).success).toBe(false);
    expect(updateUserSchema.safeParse({ ...base, first_name: "A".repeat(51), last_name: "Cruz" }).success).toBe(false);
  });

  it("folds usernames to lowercase and trims them", () => {
    expect(normalizeUsername("  JDoe ")).toBe("jdoe");
    expect(normalizeUsername(undefined)).toBe("");
    const parsed = updateUserSchema.safeParse({ first_name: "Ana", last_name: "Cruz", username: "  ANA.Cruz_1 ", email: "a@example.test", role_id: "11111111-2222-4333-8444-555555555555" });
    expect(parsed.success && parsed.data.username).toBe("ana.cruz_1");
  });

  it("only allows safe usernames of 3 to 30 characters", () => {
    for (const ok of ["abc", "a.b_c", "user_1234abcd", "x".repeat(30)]) expect(USERNAME_PATTERN.test(ok)).toBe(true);
    for (const bad of ["ab", "x".repeat(31), "has space", "ana@example.test", "emoji😀", "dash-es", "semi;colon", ""]) {
      expect(USERNAME_PATTERN.test(bad)).toBe(false);
    }
  });

  it("requires a confirmed, different new password", () => {
    const base = { current_password: "temporary1", new_password: "mine-now-123", confirm_password: "mine-now-123" };
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, confirm_password: "typo" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, new_password: "temporary1", confirm_password: "temporary1" }).success).toBe(false);
  });
});

describe("permission catalog", () => {
  it("matches the keys seeded by the RBAC migration", () => {
    const dir = new URL("../../supabase/migrations/", import.meta.url);
    const file = readdirSync(dir).find((name) => name.endsWith("_rbac.sql"))!;
    const sql = readFileSync(new URL(file, dir), "utf8");
    const seeded = [...sql.matchAll(/^\s*\('([a-z_]+\.[a-z_]+)',/gm)].map((m) => m[1]);
    expect(seeded.sort()).toEqual([...PERMISSION_KEYS].sort());
  });
});
