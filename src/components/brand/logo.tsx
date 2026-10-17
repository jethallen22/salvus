// ponytail: wallet-S glyph is hand-traced from the logo sheet; swap the paths for the designer's SVG when available.
const SYMBOL_PATHS = {
  flap: "M12 17 L47 7.5 Q51 6.5 51 10.5 L51 17 Z",
  body: "M8 24 Q8 16 16 16 H46 Q54 16 54 24 V46 Q54 54 46 54 H16 Q8 54 8 46 Z",
  clasp: "M45 29 H58 Q61 29 61 32 V38 Q61 41 58 41 H45 Z",
  swoosh:
    "M12.5 19 C19 14.5 23 24 30 31.5 C37 39 41 46.5 35.5 58 C38 47.5 33.5 41 26.5 35.5 C19.5 30 12.5 26.5 12.5 19 Z",
};

type SymbolProps = { className?: string; title?: string };

export function WalletSymbol({ className, title }: SymbolProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d={SYMBOL_PATHS.flap} className="fill-brand-taupe" />
      <path d={SYMBOL_PATHS.body} className="fill-brand-taupe" />
      <path d={SYMBOL_PATHS.clasp} className="fill-brand-taupe stroke-background" strokeWidth={2} />
      <circle cx={53.5} cy={35} r={2.4} className="fill-background" />
      <path d={SYMBOL_PATHS.swoosh} className="fill-background" />
    </svg>
  );
}

type LogoProps = { variant?: "inline" | "stacked"; className?: string };

/** Combination logo: wallet-S symbol + SALVUS wordmark (live Playfair text so it stays crisp). */
export function Logo({ variant = "inline", className = "" }: LogoProps) {
  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center text-accent ${className}`}>
        <WalletSymbol className="size-14" />
        <span className="mt-3 font-serif text-3xl leading-none tracking-[0.06em]">SALVUS</span>
        <span className="mt-2 flex items-center gap-3 text-muted-foreground">
          <span className="h-px w-6 bg-border-hover" />
          <span className="text-sm tracking-[0.3em]">wallet shop</span>
          <span className="h-px w-6 bg-border-hover" />
        </span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 text-accent ${className}`}>
      <WalletSymbol className="size-8" />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-xl tracking-[0.06em]">SALVUS</span>
        <span className="mt-1 text-[0.65rem] tracking-[0.3em] text-muted-foreground">wallet shop</span>
      </span>
    </span>
  );
}
