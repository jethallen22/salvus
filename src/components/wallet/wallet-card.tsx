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
  const role = roleLine(wallet).filter(Boolean).join(" · ");
  const updated = new Date(wallet.updated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  return (
    <Link
      href={`/dashboard/${wallet.id}/edit`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Specific properties + strong ease-out; press scale confirms the tap. */}
      <Card
        accentTop
        className="flex h-full flex-col p-6 transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:border-border-hover group-hover:shadow-md group-active:scale-[0.98] motion-reduce:transition-none motion-reduce:group-active:scale-100"
      >
        {/* Decorative here: the name right beside it already identifies the wallet. */}
        <div className="flex items-center gap-4">
          <Avatar src={wallet.photo_path && publicImageUrl(PHOTO_BUCKET, wallet.photo_path)} alt="" size={56} />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight text-balance">{name}</h2>
            {role && <p className="mt-1 text-sm leading-snug text-muted-foreground">{role}</p>}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-8">
          <div className="min-w-0">
            <p className={`small-caps inline-flex items-center gap-2 ${wallet.is_active ? "text-accent" : "text-destructive"}`}>
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              {wallet.is_active ? "Active" : "Inactive"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {owner ? `${owner} · ` : ""}Updated {updated}
            </p>
          </div>
          <span
            aria-hidden
            className="shrink-0 text-lg text-accent transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        </div>
      </Card>
    </Link>
  );
}
