import Image from "next/image";

type Tone = "green" | "white";

// The logo PNGs are 1080x1080 with generous padding; crop to the artwork with an offset window (px in source).
const CROPS = {
  logo: { x: 180, y: 280, w: 720, h: 530 },
  horizontal: { x: 70, y: 390, w: 955, h: 305 },
  symbol: { x: 397, y: 285, w: 295, h: 295 },
};

type CropProps = { crop: keyof typeof CROPS; tone: Tone; className?: string; title?: string };

function CroppedLogo({ crop, tone, className = "", title }: CropProps) {
  const { x, y, w, h } = CROPS[crop];
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <Image
        src={`/assets/images/logo-${crop === "horizontal" ? "horizontal-" : ""}${tone}.png`}
        alt={title ?? ""}
        width={1080}
        height={1080}
        priority
        className="absolute max-w-none"
        style={{ width: `${(1080 / w) * 100}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}
      />
    </span>
  );
}

type SymbolProps = { className?: string; title?: string; tone?: Tone };

/** Wallet-S glyph only. Size it with a width/size class. */
export function WalletSymbol({ className, title, tone = "green" }: SymbolProps) {
  return <CroppedLogo crop="symbol" tone={tone} className={className} title={title} />;
}

/** Full logo (symbol + SALVUS wordmark), stacked or `horizontal`. Size it with a width class. */
export function Logo({ className, tone = "green", horizontal }: { className?: string; tone?: Tone; horizontal?: boolean }) {
  return <CroppedLogo crop={horizontal ? "horizontal" : "logo"} tone={tone} className={className} title="Salvus wallet shop" />;
}
