"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import type { RoleFormState } from "@/app/dashboard/roles/actions";
import { PERMISSION_KEYS, PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Props = {
  action: (state: RoleFormState, formData: FormData) => Promise<RoleFormState>;
  initial: { name: string; description: string; permissions: PermissionKey[] };
  /** Permissions the editor may switch on (everything for a System Administrator). */
  grantable: PermissionKey[];
  submitLabel: string;
};

const GROUPS = [...new Set(PERMISSION_KEYS.map((key) => PERMISSIONS[key].group))];

export function RoleForm({ action, initial, grantable, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      // Submitted manually so React doesn't reset the checkboxes after a failed save.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <Field id="name" label="Role name" error={errors.name}>
        <Input {...fieldA11y("name", errors.name)} name="name" required maxLength={40} defaultValue={initial.name} />
      </Field>
      <Field id="description" label="Description" optional error={errors.description}>
        <Textarea {...fieldA11y("description", errors.description)} name="description" rows={2} maxLength={200} defaultValue={initial.description} className="min-h-20" />
      </Field>

      <fieldset aria-describedby={errors.permissions ? "permissions-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Permissions</legend>
        {GROUPS.map((group) => (
          <div key={group} className="mt-4">
            <p className="small-caps mb-1 text-accent">{group}</p>
            <div className="divide-y divide-border border-y border-border">
              {PERMISSION_KEYS.filter((key) => PERMISSIONS[key].group === group).map((key) => {
                const has = initial.permissions.includes(key);
                const locked = !grantable.includes(key);
                return (
                  <div key={key} className="py-2">
                    {/* A permission the editor lacks can't be added, and an existing one is kept as is. */}
                    {locked && has && <input type="hidden" name="permissions" value={key} />}
                    <Switch
                      id={`perm-${key}`}
                      name={locked ? undefined : "permissions"}
                      value={key}
                      defaultChecked={has}
                      disabled={locked}
                      label={PERMISSIONS[key].label}
                      description={locked ? `${PERMISSIONS[key].description}. You don't have this permission.` : PERMISSIONS[key].description}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {errors.permissions && (
          <p id="permissions-error" className="mt-3 text-sm text-destructive">
            {errors.permissions}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col-reverse gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-end">
        <p role="status" aria-live="polite" className="text-sm text-destructive sm:mr-auto">
          {errors.form}
        </p>
        <Link href="/dashboard/roles" className={buttonClasses("ghost")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
