import Image from "next/image";

type AvatarProps = { src?: string | null; alt: string; size: number; className?: string };

/** Round profile photo, or the Salvus default silhouette when there isn't one. */
export function Avatar({ src, alt, size, className = "" }: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} unoptimized className="size-full object-cover" />
      ) : (
        <svg viewBox="0 0 64 64" aria-hidden className="size-full">
          <circle cx="32" cy="25" r="11" className="fill-brand-taupe" />
          <path d="M11 60c1.5-11.5 9.8-18 21-18s19.5 6.5 21 18z" className="fill-brand-taupe" />
        </svg>
      )}
    </span>
  );
}
