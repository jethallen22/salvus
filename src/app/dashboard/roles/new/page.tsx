import type { Metadata } from "next";
import { saveRole } from "@/app/dashboard/roles/actions";
import { RoleForm } from "@/components/roles/role-form";
import { SectionLabel } from "@/components/ui/section-label";
import { PERMISSION_KEYS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "New role" };

export default async function NewRolePage() {
  const { access } = await requirePermission("roles.manage");

  return (
    <div className="mx-auto max-w-2xl">
      <SectionLabel>New role</SectionLabel>
      <h1 className="mb-12 text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">Create a role</h1>
      <RoleForm
        action={saveRole.bind(null, null)}
        initial={{ name: "", description: "", permissions: [] }}
        grantable={access.isSuper ? PERMISSION_KEYS : access.permissions.slice()}
        submitLabel="Create role"
      />
    </div>
  );
}
