"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import type { UserFormState } from "@/app/dashboard/users/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { Role } from "@/types/access";
import { PasswordField } from "./password-field";

type Props = {
  mode: "create" | "edit";
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  roles: Pick<Role, "id" | "name" | "is_super">[];
  initial: { first_name: string; middle_name: string; last_name: string; username: string; email: string; role_id: string };
  /** Super roles can only be handed out by a super admin. */
  canAssignSuper: boolean;
  /** Why the role can't be changed here (e.g. it's your own account), if it can't. */
  roleLockedReason?: string;
};

export function UserForm({ mode, action, roles, initial, canAssignSuper, roleLockedReason }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  if (state.created) {
    return (
      <Card accentTop className="p-8 sm:p-10">
        <p className="small-caps text-accent">User created</p>
        <h2 className="mt-2 text-2xl">Share these sign-in details</h2>
        <p className="mt-2 text-muted-foreground">
          The password is shown only now. They&rsquo;ll choose their own the first time they sign in.
        </p>
        <dl className="mt-6 border-t border-border">
          <div className="flex items-center justify-between gap-4 border-b border-border py-3">
            <dt className="small-caps text-muted-foreground">Username</dt>
            <dd className="min-w-0 truncate font-mono">{state.created.username}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border py-3">
            <dt className="small-caps text-muted-foreground">Temporary password</dt>
            <dd className="font-mono">{state.created.password}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <CopyButton text={`Username: ${state.created.username}\nTemporary password: ${state.created.password}`} label="Copy details" />
          <Link href={`/dashboard/users/${state.created.id}/edit`} className={buttonClasses("ghost")}>
            View user
          </Link>
          <Link href="/dashboard/users" className={buttonClasses("ghost")}>
            Back to users
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="first_name" label="First name" error={errors.first_name}>
          <Input {...fieldA11y("first_name", errors.first_name)} name="first_name" autoComplete="off" required maxLength={50} defaultValue={initial.first_name} />
        </Field>
        <Field id="last_name" label="Last name" error={errors.last_name}>
          <Input {...fieldA11y("last_name", errors.last_name)} name="last_name" autoComplete="off" required maxLength={50} defaultValue={initial.last_name} />
        </Field>
      </div>
      <Field id="middle_name" label="Middle name" optional error={errors.middle_name}>
        <Input {...fieldA11y("middle_name", errors.middle_name)} name="middle_name" autoComplete="off" maxLength={50} defaultValue={initial.middle_name} />
      </Field>
      <Field id="username" label="Username" hint="They type this to sign in. Letters, numbers, dots and underscores." error={errors.username}>
        <Input
          {...fieldA11y("username", errors.username, "They type this to sign in. Letters, numbers, dots and underscores.")}
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={30}
          defaultValue={initial.username}
          className="font-mono"
        />
      </Field>
      <Field id="email" label="Email" hint="Kept on file; they don't use it to sign in." error={errors.email}>
        <Input {...fieldA11y("email", errors.email, "Kept on file; they don't use it to sign in.")} name="email" type="email" autoComplete="off" required maxLength={254} defaultValue={initial.email} />
      </Field>
      <Field id="role_id" label="Role" hint={roleLockedReason} error={errors.role_id}>
        {roleLockedReason && <input type="hidden" name="role_id" value={initial.role_id} />}
        <Select
          {...fieldA11y("role_id", errors.role_id, roleLockedReason)}
          name={roleLockedReason ? undefined : "role_id"}
          required
          disabled={Boolean(roleLockedReason)}
          defaultValue={initial.role_id}
        >
          <option value="" disabled>
            Choose…
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id} disabled={role.is_super && !canAssignSuper}>
              {role.name}
            </option>
          ))}
        </Select>
      </Field>
      {mode === "create" && <PasswordField label="Temporary password" error={errors.password} />}

      <div className="flex flex-col-reverse gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-end">
        <p role="status" aria-live="polite" className="text-sm sm:mr-auto">
          {errors.form && <span className="text-destructive">{errors.form}</span>}
          {state.saved && <span className="text-accent">Changes saved.</span>}
        </p>
        <Link href="/dashboard/users" className={buttonClasses("ghost")}>
          {mode === "create" ? "Cancel" : "Back to users"}
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
