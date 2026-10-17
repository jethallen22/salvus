import type { ComponentProps } from "react";

const CONTROL =
  "w-full rounded-md border border-input bg-transparent px-4 text-base text-foreground " +
  "placeholder:text-muted-foreground/60 transition-colors duration-150 ease-out hover:border-accent-secondary " +
  "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-destructive";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${CONTROL} h-12 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${CONTROL} min-h-32 py-3 leading-relaxed ${className}`} {...props} />;
}

const CHEVRON =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%236b5e52' stroke-width='1.5'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat";

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${CONTROL} ${CHEVRON} h-12 appearance-none pr-10 ${className}`} {...props} />;
}
