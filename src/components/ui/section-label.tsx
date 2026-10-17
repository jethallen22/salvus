import type { ReactNode } from "react";

/** Tracked small-caps label between hairline rules: the editorial section marker. */
export function SectionLabel({ children, align = "center" }: { children: ReactNode; align?: "center" | "start" }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      {align === "center" && <span aria-hidden className="h-px flex-1 bg-border" />}
      <span className="small-caps text-accent">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}
