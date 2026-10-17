import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createWallet } from "@/app/dashboard/actions";
import { SectionLabel } from "@/components/ui/section-label";
import { WalletForm } from "@/components/wallet/wallet-form";
import { requireUser } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { can, canManageWallet } from "@/lib/permissions";
import { EMPTY_WALLET_VALUES } from "@/lib/validation/wallet";

export const metadata: Metadata = { title: "New wallet" };

export default async function NewWalletPage() {
  const { supabase, user, access } = await requireUser();
  if (!canManageWallet(access, true)) redirect("/dashboard");

  // Wallet managers can create on behalf of any active user.
  let owners: { id: string; label: string }[] | undefined;
  if (can(access, "wallets.manage_all")) {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, middle_name, last_name, username")
      .eq("is_active", true)
      .order("last_name")
      .order("first_name")
      .returns<{ id: string; first_name: string; middle_name: string | null; last_name: string; username: string }[]>();
    owners = (data ?? []).map((p) => ({
      id: p.id,
      label: p.id === user.id ? `Me (${p.username})` : fullName(p) ? `${fullName(p)} (${p.username})` : p.username,
    }));
  }

  return (
    <>
      <SectionLabel>New wallet</SectionLabel>
      <h1 className="mb-4 text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">Create a profile</h1>
      <p className="mx-auto mb-12 max-w-xl text-center text-lg text-muted-foreground">
        After saving you&rsquo;ll get the link to write onto the wallet&rsquo;s NFC tag.
      </p>
      <WalletForm action={createWallet} initialValues={EMPTY_WALLET_VALUES} ownerId={user.id} owners={owners} submitLabel="Create wallet" />
    </>
  );
}
