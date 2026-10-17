import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { WalletCard, type WalletSummary } from "@/components/wallet/wallet-card";
import { WalletSymbol } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth";
import { canManageWallet } from "@/lib/permissions";

export const metadata: Metadata = { title: "Your wallets" };

export default async function DashboardPage() {
  const { supabase, user, access } = await requireUser();
  const canCreate = canManageWallet(access, true);
  const { data, error } = await supabase
    .from("wallets")
    .select("id, first_name, middle_name, last_name, profile_type, school, year_level, company, job_title, photo_path, is_active, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<WalletSummary[]>();
  const wallets = data ?? [];

  return (
    <>
      <SectionLabel>Dashboard</SectionLabel>
      <div className="mb-16 flex flex-col items-center gap-6 text-center">
        <h1 className="text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-6xl">Your wallets</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Each wallet has its own link. Write it to the NFC tag, and a tap opens the profile you set here.
        </p>
        {canCreate ? (
          <Link href="/dashboard/new" className={buttonClasses("primary")}>
            New wallet
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Your role can&rsquo;t create wallets. Ask your administrator.</p>
        )}
      </div>

      {error && <p className="text-center text-destructive">Couldn&rsquo;t load your wallets. Please refresh.</p>}

      {!error && wallets.length === 0 && (
        <Card className="mx-auto flex max-w-md flex-col items-center p-10 text-center">
          <WalletSymbol className="size-14 opacity-80" />
          <h2 className="mt-6 text-2xl">No wallets yet</h2>
          <p className="mt-2 text-muted-foreground">Create your first profile, then write its link to your tag.</p>
        </Card>
      )}

      {wallets.length > 0 && (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => (
            <li key={wallet.id}>
              <WalletCard wallet={wallet} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
