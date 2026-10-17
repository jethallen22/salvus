import Link from "next/link";
import type { Wallet } from "@/types/wallet";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { fullName, roleLine } from "@/lib/format";
import { PHOTO_BUCKET, publicImageUrl } from "@/lib/storage";

export type WalletSummary = Pick<
  Wallet,
  "id" | "first_name" | "middle_name" | "last_name" | "profile_type" | "school" | "year_level" | "company" | "job_title" | "photo_path" | "is_active" | "updated_at"
>;

export function WalletCard({ wallet, owner }: { wallet: WalletSummary; owner?: string }) {
  const name = fullName(wallet);
  const updated = new Date(wallet.updated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  return (
    <Link
      href={`/dashboard/${wallet.id}/edit`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card accentTop hoverEffect className="flex h-full flex-col p-8">
        <div className="flex items-start justify-between gap-4">
          <p className={`small-caps ${wallet.is_active ? "text-accent" : "text-destructive"}`}>
            {wallet.is_active ? "Active" : "Inactive"}
          </p>
          {/* Decorative here: the name right below already identifies the wallet. */}
          <Avatar src={wallet.photo_path && publicImageUrl(PHOTO_BUCKET, wallet.photo_path)} alt="" size={48} />
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-snug">{name}</h2>
        <p className="mt-1 text-muted-foreground">{roleLine(wallet).filter(Boolean).join(" · ")}</p>
        {owner && <p className="small-caps mt-3 text-[0.625rem] text-muted-foreground">Owner · {owner}</p>}
        <p className="mt-auto pt-6 text-sm text-muted-foreground">
          Updated {updated}
          <span aria-hidden className="ml-2 inline-block text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Edit →
          </span>
        </p>
      </Card>
    </Link>
  );
}
