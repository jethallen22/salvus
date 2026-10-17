import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfile } from "@/components/wallet/public-profile";
import { getPublicWallet } from "@/lib/public-wallet";

// The token in the URL is the only key to this page: keep it out of search engines
// and out of the Referer header when visitors follow the owner's social links.
export const metadata: Metadata = {
  title: "Wallet owner",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TapPage({ params }: PageProps<"/w/[token]">) {
  const { token } = await params;
  const wallet = await getPublicWallet(token);
  if (!wallet) notFound();

  return <PublicProfile wallet={wallet} token={token} />;
}
