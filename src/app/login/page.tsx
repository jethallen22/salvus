import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="grid w-full flex-1 lg:grid-cols-2">
      <section className="relative flex flex-col justify-end overflow-hidden bg-accent px-6 pb-10 pt-14 text-accent-foreground sm:px-10 lg:px-16 lg:pb-20 lg:pt-24">
        {/* Same green as this panel, so it's inverted to white for the faded watermark. */}
        <Image
          src="/assets/images/logo-symbol-green.png"
          alt=""
          width={1080}
          height={1080}
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-[26rem] max-w-none brightness-0 invert opacity-20 lg:-bottom-40 lg:-right-40 lg:size-[44rem]"
        />
        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg">
          <p className="small-caps animate-rise mb-4 text-accent-foreground/70 lg:mb-6">Owner access</p>
          <h1 className="animate-rise text-balance text-4xl leading-[1.1] tracking-[-0.01em] [--i:1] lg:text-6xl">
            Manage your wallets
          </h1>
          <p className="animate-rise mt-4 max-w-[34ch] text-balance text-accent-foreground/80 [--i:2] lg:mt-6 lg:text-lg">
            Sign in to edit the profile your Salvus wallet shares when it&rsquo;s tapped.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto w-full max-w-sm">
          <Logo horizontal className="animate-rise mb-10 hidden lg:flex [--i:3] lg:mb-14 lg:w-52" />
          <div className="flex justify-center w-full"><Logo className="animate-rise mb-6 w-38 [--i:3] lg:hidden" /></div>
          <div className="animate-rise [--i:4]">
            <LoginForm
              initialError={error === "inactive" ? "This account has been deactivated. Contact your administrator." : undefined}
            />
          </div>
          <p className="animate-rise mt-8 text-sm text-muted-foreground [--i:5]">
            Accounts are created by your administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
