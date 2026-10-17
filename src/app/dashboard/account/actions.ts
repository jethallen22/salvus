"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { changePasswordSchema, fieldErrors } from "@/lib/validation/user";

export type ChangePasswordState = { errors?: Record<string, string>; saved?: boolean };

export async function changePassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const { supabase, user, access } = await requireUser({ allowPasswordChange: true });
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // Prove knowledge of the current password with a throwaway client, so a hijacked session
  // alone can't take over the account. It doesn't touch this browser's cookies.
  const verifier = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verifyError) return { errors: { current_password: "Current password is incorrect" } };
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (error) return { errors: { new_password: error.code === "weak_password" ? "Choose a stronger password" : "Couldn't change your password. Please try again." } };

  if (access.mustChangePassword) {
    const { error: flagError } = await createAdminClient()
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
    if (flagError) return { errors: { form: "Password changed, but please try once more to finish." } };
    redirect("/dashboard");
  }
  return { saved: true };
}
