import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteWallet, regenerateLink, setWalletActive, updateWallet } from "@/app/dashboard/actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionLabel } from "@/components/ui/section-label";
import { WalletForm } from "@/components/wallet/wallet-form";
import { requireUser } from "@/lib/auth";
import { canManageWallet } from "@/lib/permissions";
import { decryptToken } from "@/lib/crypto/token";
import { fullName } from "@/lib/format";
import { tapUrl } from "@/lib/site";
import { toFormValues } from "@/lib/validation/wallet";
import type { Wallet } from "@/types/wallet";

export const metadata: Metadata = { title: "Edit wallet" };

function readTapUrl(wallet: Wallet): string | null {
  try {
    return tapUrl(decryptToken(wallet.token_encrypted));
  } catch {
    return null; // TOKEN_ENC_KEY changed since this link was made; regenerating fixes it.
  }
}

export default async function EditWalletPage({ params, searchParams }: PageProps<"/dashboard/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase, user, access } = await requireUser();
  // RLS returns the wallet only if it's yours or you may view all wallets.
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*, owner:profiles!wallets_owner_profile_fkey(first_name, middle_name, last_name, username)")
    .eq("id", id)
    .maybeSingle<Wallet & { owner: { first_name: string; middle_name: string | null; last_name: string; username: string } | null }>();
  if (!wallet) notFound();

  const isOwner = wallet.owner_id === user.id;
  const canManage = canManageWallet(access, isOwner);

  const { created } = await searchParams;
  const url = readTapUrl(wallet);
  const name = fullName(wallet);

  return (
    <>
      <SectionLabel>Edit wallet</SectionLabel>
      <h1 className={`${isOwner ? "mb-12" : "mb-2"} text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl`}>{name}</h1>
      {!isOwner && (
        <p className="small-caps mb-12 text-center text-muted-foreground">
          Owned by {(wallet.owner && fullName(wallet.owner)) || wallet.owner?.username || "another user"}
        </p>
      )}

      <Card accentTop className="mb-16 p-8 sm:p-10">
        <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="small-caps text-accent">{created ? "Wallet created" : "Your tag link"}</p>
            <h2 className="mt-2 text-2xl">{created ? "Now write this link to your tag" : "Link on the NFC tag"}</h2>
            {url ? (
              <p className="mt-4 rounded-md border border-border bg-background px-4 py-3 font-mono text-sm break-all">{url}</p>
            ) : (
              <p className="mt-4 text-destructive">This link can&rsquo;t be shown anymore. Generate a new one below.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {url && <CopyButton text={url} />}
              {url && wallet.is_active && (
                <a href={url} target="_blank" rel="noopener" className={buttonClasses("ghost")}>
                  Open tap page ↗
                </a>
              )}
            </div>
            {!wallet.is_active && (
              <p className="mt-4 text-sm text-destructive">This wallet is inactive, so its link shows a &ldquo;not active&rdquo; page.</p>
            )}
          </div>

          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground marker:font-mono marker:text-accent md:border-l md:border-border md:pl-8">
            <li>Install <span className="text-foreground">NFC Tools</span> (iOS or Android).</li>
            <li>Write → Add a record → URL/URI.</li>
            <li>Paste the link, tap Write, hold your phone to the wallet.</li>
            <li>Don&rsquo;t lock the tag until your final demo.</li>
          </ol>
        </div>

        {canManage ? (
        <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6">
          <form action={setWalletActive.bind(null, wallet.id, !wallet.is_active)}>
            <ConfirmButton
              variant="outline"
              message={wallet.is_active ? "Deactivate? Tapping the wallet will show a “not active” page." : "Reactivate this wallet's link?"}
            >
              {wallet.is_active ? "Deactivate" : "Reactivate"}
            </ConfirmButton>
          </form>
          <form action={regenerateLink.bind(null, wallet.id)}>
            <ConfirmButton variant="outline" message="Generate a new link? The current one stops working and you'll need to rewrite the tag.">
              New link
            </ConfirmButton>
          </form>
          <form action={deleteWallet.bind(null, wallet.id)} className="sm:ml-auto">
            <ConfirmButton variant="danger" message="Delete this wallet permanently? This can't be undone.">
              Delete
            </ConfirmButton>
          </form>
        </div>
        ) : (
          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Your role can view this wallet but not change it.
          </p>
        )}
      </Card>

      {canManage && (
        <WalletForm
          action={updateWallet.bind(null, wallet.id)}
          initialValues={toFormValues(wallet)}
          ownerId={wallet.owner_id}
          submitLabel="Save changes"
        />
      )}
    </>
  );
}
