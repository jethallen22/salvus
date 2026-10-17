import { SOCIAL_PLATFORMS } from "@/constants/social-platforms";
import { fullName, roleLine } from "@/lib/format";
import type { PublicWallet } from "@/types/wallet";

// RFC 6350 text escaping; also strips CR/LF so a value can't inject extra vCard lines.
const esc = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");

export function buildVCard(wallet: PublicWallet): string {
  const [title, org] = roleLine(wallet);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(wallet.last_name)};${esc(wallet.first_name)};${esc(wallet.middle_name ?? "")};;`,
    `FN:${esc(fullName(wallet))}`,
    org && `ORG:${esc(org)}`,
    title && `TITLE:${esc(title)}`,
    wallet.email && `EMAIL;TYPE=INTERNET:${esc(wallet.email)}`,
    wallet.mobile && `TEL;TYPE=CELL:${esc(wallet.mobile)}`,
    ...wallet.social_links.map(
      (link) => `URL;TYPE=${esc(SOCIAL_PLATFORMS[link.platform].label)}:${esc(link.url)}`,
    ),
    wallet.bio && `NOTE:${esc(wallet.bio)}`,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n") + "\r\n";
}
