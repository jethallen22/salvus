import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div"> & { accentTop?: boolean; hoverEffect?: boolean };

export function Card({ accentTop, hoverEffect, className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-lg border border-border bg-card shadow-sm",
        accentTop && "border-t-2 border-t-accent",
        hoverEffect && "transition-all duration-200 ease-out hover:border-border-hover hover:bg-muted/30 hover:shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
