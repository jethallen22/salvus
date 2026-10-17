"use client";

import { startTransition, useActionState } from "react";
import type { UserFormState } from "@/app/dashboard/users/actions";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { PasswordField } from "./password-field";

export function ResetPasswordForm({ action }: { action: (state: UserFormState, formData: FormData) => Promise<UserFormState> }) {
  const [state, formAction, pending] = useActionState(action, {});

  if (state.reset) {
    return (
      <div className="flex flex-col gap-4">
        <p>
          New temporary password: <span className="font-mono">{state.reset.password}</span>
        </p>
        <p className="text-sm text-muted-foreground">Shown only now. They&rsquo;ll choose their own at next sign-in.</p>
        <div>
          <CopyButton text={state.reset.password} label="Copy password" />
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <PasswordField label="New temporary password" error={state.errors?.password} />
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </div>
    </form>
  );
}
