/** The URL written onto a wallet's NFC tag. */
export function tapUrl(token: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/w/${token}`;
}
