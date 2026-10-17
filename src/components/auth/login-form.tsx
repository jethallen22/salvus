"use client";

import { useActionState } from "react";
import { authenticate, type AuthState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, { error: initialError });

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <Field id="username" label="Username">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          defaultValue={state.username}
        />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <p role="status" aria-live="polite" className="min-h-6 text-sm text-destructive">
        {state.error}
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
