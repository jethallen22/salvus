import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteUser, resetUserPassword, setUserActive, updateUser } from "@/app/dashboard/users/actions";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SectionLabel } from "@/components/ui/section-label";
import { ResetPasswordForm } from "@/components/users/reset-password-form";
import { UserForm } from "@/components/users/user-form";
import { requirePermission } from "@/lib/auth";
import { fullName } from "@/lib/format";
import type { Role, UserProfile } from "@/types/access";

export const metadata: Metadata = { title: "Edit user" };

const ERRORS: Record<string, string> = {
  "last-admin": "At least one active System Administrator is required.",
  forbidden: "You can't do that to this account.",
  failed: "Something went wrong. Please try again.",
};

export default async function EditUserPage({ params, searchParams }: PageProps<"/dashboard/users/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase, access } = await requirePermission("users.manage");
  const [{ data: user }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, username, first_name, middle_name, last_name, is_active, must_change_password, created_at, role:roles(id, name, is_super)")
      .eq("id", id)
      .maybeSingle<UserProfile>(),
    supabase.from("roles").select("id, name, is_super").order("name").returns<Pick<Role, "id" | "name" | "is_super">[]>(),
  ]);
  if (!user) notFound();

  const { error } = await searchParams;
  const pageError = typeof error === "string" ? ERRORS[error] : undefined;
  const isSelf = user.id === access.userId;
  const readOnly = user.role.is_super && !access.isSuper;

  return (
    <div className="mx-auto max-w-xl">
      <SectionLabel>Edit user</SectionLabel>
      <h1 className="mb-2 text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">{fullName(user) || user.username}</h1>
      <p className={`small-caps mb-12 text-center ${user.is_active ? "text-accent" : "text-destructive"}`}>
        {user.role.name} · {user.is_active ? (user.must_change_password ? "Temporary password" : "Active") : "Deactivated"}
      </p>

      {pageError && (
        <p role="alert" className="mb-8 text-center text-sm text-destructive">
          {pageError}
        </p>
      )}

      {readOnly ? (
        <Card accentTop className="p-8 text-center sm:p-10">
          <p className="text-lg">Only a System Administrator can change another System Administrator.</p>
        </Card>
      ) : (
        <>
          <UserForm
            mode="edit"
            action={updateUser.bind(null, user.id)}
            roles={roles ?? []}
            initial={{ first_name: user.first_name, middle_name: user.middle_name ?? "", last_name: user.last_name, username: user.username, email: user.email, role_id: user.role.id }}
            canAssignSuper={access.isSuper}
            roleLockedReason={isSelf ? "You can't change your own role." : undefined}
          />

          {isSelf ? (
            <p className="mt-12 border-t border-border pt-8 text-sm text-muted-foreground">
              This is your account. Change your password on the Account page; another administrator would need to
              deactivate or delete it.
            </p>
          ) : (
            <>
              <section className="mt-16 border-t border-border pt-8">
                <p className="small-caps text-accent">Password</p>
                <h2 className="mb-6 mt-2 text-2xl">Reset password</h2>
                <ResetPasswordForm action={resetUserPassword.bind(null, user.id)} />
              </section>

              <section className="mt-16 flex flex-col gap-6 border-t border-border pt-8">
                <div>
                  <p className="small-caps text-accent">Access</p>
                  <h2 className="mt-2 text-2xl">{user.is_active ? "Deactivate account" : "Reactivate account"}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {user.is_active
                      ? "Blocks sign-in immediately and takes their wallets' tap pages offline. Nothing is deleted."
                      : "Lets them sign in again and brings their wallets' tap pages back."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <form action={setUserActive.bind(null, user.id, !user.is_active)}>
                    <ConfirmButton
                      variant="outline"
                      message={user.is_active ? `Deactivate ${user.username}? They'll be signed out and their tap pages go offline.` : `Reactivate ${user.username}?`}
                    >
                      {user.is_active ? "Deactivate" : "Reactivate"}
                    </ConfirmButton>
                  </form>
                  <form action={deleteUser.bind(null, user.id)} className="sm:ml-auto">
                    <ConfirmButton variant="danger" message={`Delete ${user.username} and all their wallets permanently? This can't be undone.`}>
                      Delete user
                    </ConfirmButton>
                  </form>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
