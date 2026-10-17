import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { SOCIAL_PLATFORMS } from "@/constants/social-platforms";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { MailIcon, PhoneIcon, SocialIcon } from "@/components/ui/icons";
import { displayUrl, formatMobile, fullName, roleLine } from "@/lib/format";
import { LOGO_BUCKET, PHOTO_BUCKET, publicImageUrl } from "@/lib/storage";
import type { PublicWallet } from "@/types/wallet";

function ContactRow({ icon, label, href, value, external }: { icon: ReactNode; label: string; href: string; value: string; external?: boolean }) {
  return (
    <li className="border-b border-border">
      <a
        href={href}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        className="group -mx-3 flex min-h-16 items-center justify-between gap-4 rounded-md px-3 py-3 touch-manipulation transition-colors duration-150 ease-out hover:bg-card/70 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="small-caps block text-muted-foreground">{label}</span>
          <span className="block text-base leading-snug text-foreground [overflow-wrap:anywhere]">{value}</span>
        </span>
        <span aria-hidden className="shrink-0 text-brand-taupe transition-transform duration-200 ease-out group-hover:translate-x-0.5">
          {external ? "↗" : "→"}
        </span>
        {external && <span className="sr-only">(opens in a new tab)</span>}
      </a>
    </li>
  );
}

/**
 * The page a tap on the wallet opens. The hero is the wallet's own espresso leather,
 * with the owner's name set into it the way a name is stamped on the real thing.
 */
export function PublicProfile({ wallet, token }: { wallet: PublicWallet; token: string }) {
  const name = fullName(wallet);
  const [role, organization] = roleLine(wallet);
  const hasContact = Boolean(wallet.email || wallet.mobile || wallet.social_links.length);

  return (
    <main className="mx-auto w-full max-w-md flex-1 sm:px-4 sm:py-12">
      <header className="bg-accent px-6 pt-6 pb-8 text-accent-foreground sm:rounded-2xl sm:px-8">
        <Logo horizontal tone="white" className="w-36 animate-rise" />

        <div className="mt-10 flex animate-rise [--i:1]">
          <Avatar
            src={wallet.photo_path && publicImageUrl(PHOTO_BUCKET, wallet.photo_path)}
            alt={`Photo of ${name}`}
            size={96}
            className="ring-offset-4 ring-offset-accent"
          />
        </div>

        <h1 className="mt-8 text-[clamp(2.25rem,10vw,2.75rem)] leading-[1.05] tracking-[-0.02em] text-balance animate-rise [--i:2]">
          {/* Keep each name part whole so "Santos-Villanueva" never breaks at its hyphen. */}
          {name.split(" ").map((part, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span className="whitespace-nowrap">{part}</span>
            </Fragment>
          ))}
        </h1>

        <div className="mt-4 animate-rise [--i:3]">
          <p className="text-lg text-accent-foreground/80">
            {role ?? (wallet.profile_type === "student" ? "Student" : "Professional")}
          </p>
          {organization && (
            <p className="mt-3 flex items-center gap-3">
              {wallet.logo_path && (
                <Image
                  src={publicImageUrl(LOGO_BUCKET, wallet.logo_path)}
                  alt={`${organization} logo`}
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 shrink-0 rounded-md bg-card object-contain p-1"
                />
              )}
              <span className="font-serif text-xl leading-tight">{organization}</span>
            </p>
          )}
        </div>

        {wallet.bio && (
          <p className="mt-6 leading-relaxed text-accent-foreground/85 animate-rise [--i:4]">{wallet.bio}</p>
        )}

        <a
          href={`/w/${token}/contact.vcf`}
          download
          className={buttonClasses("inverse", "mt-8 min-h-12 w-full active:scale-[0.97] animate-rise [--i:5]")}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
          </svg>
          Save contact
        </a>
      </header>

      <div className="px-6 pt-10 pb-14 sm:px-2">
        <section aria-labelledby="contact-heading" className="animate-rise [--i:6]">
          <h2 id="contact-heading" className="small-caps text-muted-foreground">
            Contact
          </h2>
          {hasContact ? (
            <ul className="mt-3 border-t border-border">
              {wallet.email && <ContactRow icon={<MailIcon className="size-5" />} label="Email" href={`mailto:${wallet.email}`} value={wallet.email} />}
              {wallet.mobile && <ContactRow icon={<PhoneIcon className="size-5" />} label="Mobile" href={`tel:${wallet.mobile}`} value={formatMobile(wallet.mobile)} />}
              {wallet.social_links.map((link) => (
                <ContactRow
                  key={link.url}
                  icon={<SocialIcon platform={link.platform} className="size-5" />}
                  label={SOCIAL_PLATFORMS[link.platform].label}
                  href={link.url}
                  value={displayUrl(link.url)}
                  external
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted-foreground">The owner hasn&rsquo;t shared contact details.</p>
          )}
        </section>

        {hasContact && (
          <footer className="mt-14 text-sm text-muted-foreground">
            Found this wallet? Please reach its owner using the details above.
          </footer>
        )}
      </div>
    </main>
  );
}
