import type { ComponentProps } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger" | "inverse";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium tracking-[0.05em] " +
  "touch-manipulation transition-all duration-200 ease-out cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

// Focus ring colours live per variant: a button on the espresso field needs an ivory ring.
const ON_LIGHT = "focus-visible:ring-ring focus-visible:ring-offset-background";

// Design-system note: no hover lift. Color and shadow shifts only, per "restraint".
const VARIANTS: Record<Variant, string> = {
  primary: `bg-accent text-accent-foreground shadow-sm hover:bg-accent-secondary hover:shadow-md ${ON_LIGHT}`,
  outline: `border border-foreground text-foreground hover:border-accent-secondary hover:bg-muted hover:text-accent ${ON_LIGHT}`,
  ghost: `px-2 text-muted-foreground decoration-accent underline-offset-4 hover:text-foreground hover:underline ${ON_LIGHT}`,
  danger: `border border-destructive/60 text-destructive hover:bg-destructive hover:text-accent-foreground ${ON_LIGHT}`,
  inverse: "bg-accent-foreground text-accent hover:bg-card focus-visible:ring-accent-foreground focus-visible:ring-offset-accent",
};

/** Shared so links can look like buttons without nesting <a> in <button>. */
export function buttonClasses(variant: Variant = "primary", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${className}`;
}

export function Button({
  variant,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
