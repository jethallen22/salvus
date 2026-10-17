import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { WalletCard, type WalletSummary } from "@/components/wallet/wallet-card";
import { requirePermission } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "All wallets" };

type Row = WalletSummary & { owner: { first_name: string; middle_name: string | null; last_name: string; username: string; is_active: boolean } | null };

export default async function AllWalletsPage() {
  const { supabase, access } = await requirePermission("wallets.view_all");
  const { data, error } = await supabase
    .from("wallets")
    .select(
      "id, first_name, middle_name, last_name, profile_type, school, year_level, company, job_title, photo_path, is_active, updated_at, owner:profiles!wallets_owner_profile_fkey(first_name, middle_name, last_name, username, is_active)",
    )
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  const wallets = data ?? [];

  return (
    <>
      <SectionLabel>All wallets</SectionLabel>
      <div className="mb-16 flex flex-col items-center gap-6 text-center">
        <h1 className="text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-6xl">Every wallet</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {wallets.length} wallet{wallets.length === 1 ? "" : "s"} across all users.
          {!can(access, "wallets.manage_all") && " Your role can view them but not change them."}
        </p>
        {can(access, "wallets.manage_all") && (
          <Link href="/dashboard/new" className={buttonClasses("primary")}>
            New wallet for a user
          </Link>
        )}
      </div>

      {error && <p className="text-center text-destructive">Couldn&rsquo;t load wallets. Please refresh.</p>}
      {!error && wallets.length === 0 && <p className="text-center text-muted-foreground">No wallets yet.</p>}

      {wallets.length > 0 && (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => (
            <li key={wallet.id}>
              <WalletCard
                wallet={wallet}
                owner={
                  wallet.owner
                    ? `${fullName(wallet.owner) || wallet.owner.username}${wallet.owner.is_active ? "" : " (deactivated)"}`
                    : "Unknown"
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
