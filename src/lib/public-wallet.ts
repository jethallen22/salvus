import "server-only";
import { SOCIAL_PLATFORMS } from "@/constants/social-platforms";
import { hashToken, isWellFormedToken } from "@/lib/crypto/token";
import { createClient } from "@/lib/supabase/server";
import { urlMatchesPlatform } from "@/lib/validation/wallet";
import type { PublicWallet, SocialLink } from "@/types/wallet";

// Owners can write their row through the Data API directly, skipping the form's validation,
// so links are re-checked here before they reach a visitor's screen.
function isSafeLink(link: unknown): link is SocialLink {
  if (typeof link !== "object" || link === null) return false;
  const { platform, url } = link as Record<string, unknown>;
  return (
    typeof platform === "string" &&
    Object.hasOwn(SOCIAL_PLATFORMS, platform) &&
    typeof url === "string" &&
    urlMatchesPlatform(url, platform as SocialLink["platform"])
  );
}

/** The one public read path: an exact token → at most one active wallet's public fields. */
export async function getPublicWallet(token: string): Promise<PublicWallet | null> {
  if (!isWellFormedToken(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_wallet", { p_token_hash: hashToken(token) });
  const wallet = (data as PublicWallet[] | null)?.[0];
  if (!wallet) return null;
  return { ...wallet, social_links: Array.isArray(wallet.social_links) ? wallet.social_links.filter(isSafeLink) : [] };
}
