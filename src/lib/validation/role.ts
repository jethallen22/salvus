import { z } from "zod";
import { PERMISSION_KEYS, PERMISSION_REQUIRES, PERMISSIONS } from "@/constants/permissions";
import { missingPrerequisites } from "@/lib/permissions";
import { fieldErrors } from "@/lib/validation/user";

export const roleSchema = z
  .object({
    name: z.string({ error: "Enter a role name" }).trim().min(2, "Use at least 2 characters").max(40, "Use at most 40 characters"),
    description: z.string().trim().max(200, "Keep the description under 200 characters"),
    permissions: z.array(z.enum(PERMISSION_KEYS)),
  })
  .superRefine((role, ctx) => {
    for (const key of missingPrerequisites(role.permissions)) {
      const required = PERMISSION_REQUIRES[key]!;
      ctx.addIssue({
        code: "custom",
        path: ["permissions"],
        message: `“${PERMISSIONS[key].label}” also needs “${PERMISSIONS[required].label}”`,
      });
    }
  });

export type RoleInput = z.infer<typeof roleSchema>;

export function parseRoleForm(formData: FormData) {
  const result = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    permissions: [...new Set(formData.getAll("permissions"))],
  });
  return result.success ? { ok: true as const, role: result.data } : { ok: false as const, errors: fieldErrors(result.error) };
}
