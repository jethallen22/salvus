"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import type { WalletFormState } from "@/app/dashboard/actions";
import { YEAR_LEVELS } from "@/constants/year-levels";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ProfileType } from "@/types/wallet";
import type { WalletFormValues } from "@/lib/validation/wallet";
import { ImageUpload } from "./image-upload";
import { SocialLinksField } from "./social-links-field";

type Props = {
  action: (state: WalletFormState, formData: FormData) => Promise<WalletFormState>;
  initialValues: WalletFormValues;
  /** Whose wallet this is; their storage folder holds its images. */
  ownerId: string;
  /** Offered when the editor may create wallets for other users (wallets.manage_all). */
  owners?: { id: string; label: string }[];
  submitLabel: string;
};

/** Asymmetric editorial row: section title on the left, fields on the right. */
function FormSection({ label, title, description, children }: { label: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-border py-10 md:grid-cols-[0.7fr_1.3fr] md:gap-12">
      <div>
        <p className="small-caps text-accent">{label}</p>
        <h2 className="mt-2 text-2xl leading-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

const PROFILE_OPTIONS: { value: ProfileType; title: string; hint: string }[] = [
  { value: "student", title: "Student", hint: "School and year level" },
  { value: "professional", title: "Working", hint: "Company and role" },
];

export function WalletForm({ action, initialValues, ownerId, owners, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};
  const [profileType, setProfileType] = useState<ProfileType>(values.profile_type);
  const [owner, setOwner] = useState(ownerId);
  const isStudent = profileType === "student";
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      noValidate
      // Not `action={formAction}`: React then auto-resets the form after submit, which snaps the
      // controlled social-platform <select> back to its first option while its state stays put.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <FormSection label="Identity" title="Who owns this wallet" description="Shown as the headline on the tap page.">
        {owners && (
          <Field id="owner_id" label="Account" hint="The user who will own and manage this wallet." error={errors.owner_id}>
            <Select
              {...fieldA11y("owner_id", errors.owner_id, "The user who will own and manage this wallet.")}
              name="owner_id"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              {owners.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="first_name" label="First name" error={errors.first_name}>
            <Input {...fieldA11y("first_name", errors.first_name)} name="first_name" autoComplete="given-name" required maxLength={50} defaultValue={values.first_name} />
          </Field>
          <Field id="last_name" label="Last name" error={errors.last_name}>
            <Input {...fieldA11y("last_name", errors.last_name)} name="last_name" autoComplete="family-name" required maxLength={50} defaultValue={values.last_name} />
          </Field>
        </div>
        <Field id="middle_name" label="Middle name" optional error={errors.middle_name}>
          <Input {...fieldA11y("middle_name", errors.middle_name)} name="middle_name" autoComplete="additional-name" maxLength={50} defaultValue={values.middle_name} />
        </Field>
        <div className="flex flex-col gap-2">
          <p className="flex items-baseline gap-2 text-sm font-medium">
            Profile photo
            <span className="small-caps text-[0.625rem] text-muted-foreground">Optional</span>
          </p>
          <ImageUpload key={`photo-${owner}`} variant="photo" userId={owner} savedPath={initialValues.photo_path} label="Profile photo" error={errors.photo_path} />
        </div>
      </FormSection>

      <FormSection label="Occupation" title="Student or working" description="Pick one; the other details are cleared when you save.">
        <fieldset>
          <legend className="sr-only">Occupation type</legend>
          <div className="grid grid-cols-2 gap-3">
            {PROFILE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer flex-col rounded-md border border-input bg-card px-4 py-3 transition-all duration-200 ease-out touch-manipulation hover:border-accent-secondary has-[:checked]:border-accent has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
              >
                <input
                  type="radio"
                  name="profile_type"
                  value={option.value}
                  checked={profileType === option.value}
                  onChange={() => setProfileType(option.value)}
                  className="sr-only"
                />
                <span className="font-serif text-lg">{option.title}</span>
                <span className="text-sm text-muted-foreground">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isStudent ? (
          <div className="grid gap-6 sm:grid-cols-[1.3fr_0.7fr]">
            <Field id="school" label="School" error={errors.school}>
              <Input {...fieldA11y("school", errors.school)} name="school" autoComplete="organization" required maxLength={100} defaultValue={values.school} />
            </Field>
            <Field id="year_level" label="Year level" error={errors.year_level}>
              <Select {...fieldA11y("year_level", errors.year_level)} name="year_level" required defaultValue={values.year_level}>
                <option value="" disabled>
                  Choose…
                </option>
                {YEAR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="company" label="Company" error={errors.company}>
              <Input {...fieldA11y("company", errors.company)} name="company" autoComplete="organization" required maxLength={100} defaultValue={values.company} />
            </Field>
            <Field id="job_title" label="Role" error={errors.job_title}>
              <Input {...fieldA11y("job_title", errors.job_title)} name="job_title" autoComplete="organization-title" required maxLength={100} defaultValue={values.job_title} />
            </Field>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="flex items-baseline gap-2 text-sm font-medium">
            {isStudent ? "School logo" : "Company logo"}
            <span className="small-caps text-[0.625rem] text-muted-foreground">Optional</span>
          </p>
          <ImageUpload key={`logo-${owner}`} variant="logo" userId={owner} savedPath={initialValues.logo_path} label={isStudent ? "School logo" : "Company logo"} error={errors.logo_path} />
        </div>
      </FormSection>

      <FormSection label="Contact" title="How to reach you" description="Hidden on the tap page unless you switch them on.">
        <Field id="email" label="Email" optional error={errors.email}>
          <Input {...fieldA11y("email", errors.email)} name="email" type="email" autoComplete="email" maxLength={254} defaultValue={values.email} />
        </Field>
        <Switch id="show_email" name="show_email" label="Show email on tap page" defaultChecked={values.show_email} />
        <Field id="mobile" label="Mobile" optional hint="Philippine number, e.g. 0917 123 4567." error={errors.mobile}>
          <Input {...fieldA11y("mobile", errors.mobile, "Philippine number, e.g. 0917 123 4567.")} name="mobile" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} defaultValue={values.mobile} />
        </Field>
        <Switch id="show_mobile" name="show_mobile" label="Show mobile on tap page" defaultChecked={values.show_mobile} />
      </FormSection>

      <FormSection label="Social" title="Where to find you" description="Links must be https:// and match the platform you pick.">
        <SocialLinksField initialLinks={values.social_links} errors={errors} />
      </FormSection>

      <FormSection label="About" title="A short bio" description="A line or two in your own words.">
        <Field id="bio" label="Bio" optional hint="Up to 300 characters." error={errors.bio}>
          <Textarea {...fieldA11y("bio", errors.bio, "Up to 300 characters.")} name="bio" maxLength={300} rows={4} defaultValue={values.bio} />
        </Field>
      </FormSection>

      <div className="flex flex-col-reverse gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-end">
        <p role="status" aria-live="polite" className="text-sm sm:mr-auto">
          {errors.form && <span className="text-destructive">{errors.form}</span>}
          {!errors.form && hasErrors && <span className="text-destructive">Please fix the highlighted fields.</span>}
          {state.saved && <span className="text-accent">Changes saved.</span>}
        </p>
        <Link href="/dashboard" className={buttonClasses("ghost")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
