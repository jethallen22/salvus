import { Logo } from "@/components/brand/logo";
import { SectionLabel } from "@/components/ui/section-label";

export const metadata = { robots: { index: false } };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24 text-center animate-fade-in">
      <Logo className="mb-14 w-56" />
      <SectionLabel>Not found</SectionLabel>
      <h1 className="text-[2.5rem] leading-[1.1] tracking-[-0.02em]">This link isn&rsquo;t active</h1>
      <p className="mt-4 text-muted-foreground">
        If you tapped a Salvus wallet, its owner may have deactivated or replaced this link.
      </p>
    </main>
  );
}
