import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 animate-fade-in sm:py-24">
      <Logo variant="stacked" className="mb-12" />
      <Card accentTop className="p-8 sm:p-10">
        <SectionLabel>Owner access</SectionLabel>
        <h1 className="mb-2 text-center text-3xl leading-tight tracking-[-0.01em]">Manage your wallets</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Sign in to edit the profile your Salvus wallet shares when it&rsquo;s tapped.
        </p>
        <LoginForm
          initialError={error === "inactive" ? "This account has been deactivated. Contact your administrator." : undefined}
        />
        <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          Accounts are created by your administrator.
        </p>
      </Card>
    </main>
  );
}
