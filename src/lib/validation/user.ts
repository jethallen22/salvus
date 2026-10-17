import { z } from "zod";

export const passwordSchema = z
  .string({ error: "Enter a password" })
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters");

// Mirrors profiles_username_format in supabase/migrations/*_usernames.sql.
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

/** What people type is case-insensitive: "  JDoe " and "jdoe" are the same username. */
export function normalizeUsername(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

const username = z.preprocess(
  normalizeUsername,
  z.string().regex(USERNAME_PATTERN, "Use 3 to 30 letters, numbers, dots or underscores"),
);
const requiredName = (label: string) =>
  z.string({ error: `Enter ${label}` }).trim().min(1, `Enter ${label}`).max(50, "Name is too long");
const middleName = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(50, "Name is too long").optional(),
);
const names = { first_name: requiredName("a first name"), middle_name: middleName, last_name: requiredName("a last name") };
const email = z.email("Enter a valid email address").max(254);
const roleId = z.uuid("Choose a role");

export const createUserSchema = z.object({ ...names, username, email, role_id: roleId, password: passwordSchema });
export const updateUserSchema = z.object({ ...names, username, email, role_id: roleId });
export const resetPasswordSchema = z.object({ password: passwordSchema });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, { error: "Passwords don't match", path: ["confirm_password"] })
  .refine((v) => v.new_password !== v.current_password, {
    error: "Choose a password different from your current one",
    path: ["new_password"],
  });

/** First message per field, keyed by path ("form" for top-level issues). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[issue.path.join(".") || "form"] ??= issue.message;
  return errors;
}
