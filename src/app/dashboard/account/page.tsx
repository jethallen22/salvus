import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { access } = await requireUser({ allowPasswordChange: true });
  const forced = access.mustChangePassword;

  return (
    <div className="mx-auto max-w-xl">
      <SectionLabel>Account</SectionLabel>
      <h1 className="mb-4 text-center text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">
        {forced ? "Choose your password" : "Your account"}
      </h1>
      <p className="mb-12 text-center text-lg text-muted-foreground">
        {forced
          ? "Your administrator gave you a temporary password. Set your own to continue."
          : "Your details are managed by your administrator."}
      </p>

      <dl className="mb-12 border-t border-border">
        {[
          ["Name", access.fullName || "Not set"],
          ["Username", access.username],
          ["Email", access.email],
          ["Role", access.roleName],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-border py-4">
            <dt className="small-caps text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <Card accentTop className="p-8 sm:p-10">
        <h2 className="mb-6 text-2xl">{forced ? "Set your password" : "Change password"}</h2>
        <ChangePasswordForm forced={forced} />
      </Card>
    </div>
  );
}
