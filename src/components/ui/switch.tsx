import type { ComponentProps } from "react";

type SwitchProps = Omit<ComponentProps<"input">, "type"> & { id: string; label: string; description?: string };

/** Native checkbox with switch semantics; submits "on" like any checkbox. */
export function Switch({ id, label, description, className = "", ...props }: SwitchProps) {
  return (
    <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-start justify-between gap-6 touch-manipulation ${className}`}>
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={
          "relative mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-muted " +
          "transition-colors duration-200 ease-out checked:border-accent checked:bg-accent " +
          "before:absolute before:top-0.5 before:left-0.5 before:size-[1.125rem] before:rounded-full before:bg-card " +
          "before:shadow-sm before:transition-transform before:duration-200 checked:before:translate-x-5 " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        }
        {...props}
      />
    </label>
  );
}
