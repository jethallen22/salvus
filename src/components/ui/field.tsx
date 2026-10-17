import type { ReactNode } from "react";

/** aria props that tie a control to its hint/error text. */
export function fieldA11y(id: string, error?: string, hint?: string) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ id, label, error, hint, optional, className = "", children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-foreground">
        {label}
        {optional && <span className="small-caps text-[0.625rem] text-muted-foreground">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
