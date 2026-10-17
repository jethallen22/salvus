import { getPublicWallet } from "@/lib/public-wallet";
import { buildVCard } from "@/lib/vcard";

export async function GET(_request: Request, { params }: RouteContext<"/w/[token]/contact.vcf">) {
  const { token } = await params;
  const wallet = await getPublicWallet(token);
  if (!wallet) return new Response("Not found", { status: 404 });

  const filename = `${wallet.first_name}-${wallet.last_name}`.replace(/[^A-Za-z0-9-]/g, "") || "contact";
  return new Response(buildVCard(wallet), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.vcf"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
