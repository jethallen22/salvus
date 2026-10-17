"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/dashboard/account/actions";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, {});
  const errors = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <Field id="current_password" label={forced ? "Temporary password" : "Current password"} error={errors.current_password}>
        <Input {...fieldA11y("current_password", errors.current_password)} name="current_password" type="password" autoComplete="current-password" required />
      </Field>
      <Field id="new_password" label="New password" hint="At least 8 characters." error={errors.new_password}>
        <Input {...fieldA11y("new_password", errors.new_password, "At least 8 characters.")} name="new_password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <Field id="confirm_password" label="Confirm new password" error={errors.confirm_password}>
        <Input {...fieldA11y("confirm_password", errors.confirm_password)} name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {errors.form && <span className="text-destructive">{errors.form}</span>}
        {state.saved && <span className="text-accent">Password changed.</span>}
      </p>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : forced ? "Set my password" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
