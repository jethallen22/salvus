"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, USERNAME_PATTERN } from "@/lib/validation/user";

export type AuthState = { error?: string; username?: string };

const WRONG_LOGIN = "Incorrect username or password.";
// An address that can't exist, used to keep unknown-username attempts looking like wrong-password ones.
const DECOY_EMAIL = "no-such-user@salvus.invalid";

// Sign-in only: accounts are created by an administrator (and sign-ups are disabled in Supabase).
// People type a username; Supabase signs in with the email stored privately on their profile.
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(formData.get("username"));
  const password = formData.get("password");
  if (!username) return { error: "Enter your username", username };
  if (typeof password !== "string" || password.length === 0) return { error: "Enter your password", username };
  if (password.length > 72) return { error: WRONG_LOGIN, username };

  const supabase = await createClient();

  // Visitors can't read profiles, and the email must never reach the browser, hence the secret-key client.
  let email: string | undefined;
  if (USERNAME_PATTERN.test(username)) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("username", username)
      .maybeSingle<{ email: string }>();
    email = data?.email;
  }

  // Unknown username: still make a sign-in call so response shape and timing match a wrong password.
  const { error } = await supabase.auth.signInWithPassword({ email: email ?? DECOY_EMAIL, password });
  if (!email) return { error: WRONG_LOGIN, username };
  if (error?.code === "user_banned") {
    return { error: "This account has been deactivated. Contact your administrator.", username };
  }
  if (error) return { error: WRONG_LOGIN, username };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
