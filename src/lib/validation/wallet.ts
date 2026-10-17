import { z } from "zod";
import {
  MAX_SOCIAL_LINKS,
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/constants/social-platforms";
import { YEAR_LEVELS } from "@/constants/year-levels";
import type { ProfileType, WalletProfile } from "@/types/wallet";

const PH_MOBILE = /^\+639\d{9}$/;
const IMAGE_PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/;

/** "0917 123 4567" / "639171234567" → "+639171234567". Anything else is returned stripped, for the regex to reject. */
export function normalizePhMobile(input: string): string {
  const compact = input.replace(/[\s().-]/g, "");
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^639\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

export function urlMatchesPlatform(url: string, platform: SocialPlatform): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    const host = hostname.toLowerCase().replace(/^www\./, "");
    return SOCIAL_PLATFORMS[platform].hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const requiredText = (max: number, label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalText = (max: number, label: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${label} is too long`).optional());

const socialLinkSchema = z
  .object({ platform: z.enum(SOCIAL_PLATFORM_IDS), url: z.string().trim().max(300) })
  .refine(({ platform, url }) => urlMatchesPlatform(url, platform), {
    error: "Use an https:// link from the selected platform",
    path: ["url"],
  });

const baseFields = {
  first_name: requiredText(50, "First name"),
  middle_name: optionalText(50, "Middle name"),
  last_name: requiredText(50, "Last name"),
  email: z.preprocess(blankToUndefined, z.email("Enter a valid email address").max(254).optional()),
  mobile: z.preprocess(
    blankToUndefined,
    z
      .string()
      .transform(normalizePhMobile)
      .pipe(z.string().regex(PH_MOBILE, "Use a PH mobile number, e.g. 0917 123 4567"))
      .optional(),
  ),
  social_links: z.array(socialLinkSchema).max(MAX_SOCIAL_LINKS, `Up to ${MAX_SOCIAL_LINKS} links`),
  bio: optionalText(300, "Bio"),
  show_email: z.boolean(),
  show_mobile: z.boolean(),
  logo_path: z.preprocess(blankToUndefined, z.string().regex(IMAGE_PATH, "Invalid logo").optional()),
  photo_path: z.preprocess(blankToUndefined, z.string().regex(IMAGE_PATH, "Invalid photo").optional()),
};

export const walletFormSchema = z.discriminatedUnion(
  "profile_type",
  [
    z.object({
      ...baseFields,
      profile_type: z.literal("student"),
      school: requiredText(100, "School"),
      year_level: z.enum(YEAR_LEVELS, { error: "Choose a year level" }),
    }),
    z.object({
      ...baseFields,
      profile_type: z.literal("professional"),
      company: requiredText(100, "Company"),
      job_title: requiredText(100, "Role"),
    }),
  ],
  { error: "Choose Student or Working" },
);

/** Raw form values, echoed back so the form can be re-filled after a failed submit. */
export type WalletFormValues = {
  profile_type: ProfileType;
  first_name: string;
  middle_name: string;
  last_name: string;
  school: string;
  year_level: string;
  company: string;
  job_title: string;
  email: string;
  mobile: string;
  bio: string;
  logo_path: string;
  photo_path: string;
  show_email: boolean;
  show_mobile: boolean;
  social_links: { platform: SocialPlatform; url: string }[];
};

export type WalletRow = WalletProfile & { show_email: boolean; show_mobile: boolean };

export type ParsedWalletForm =
  | { ok: true; row: WalletRow; values: WalletFormValues }
  | { ok: false; errors: Record<string, string>; values: WalletFormValues };

const TEXT_FIELDS = [
  "first_name", "middle_name", "last_name", "school", "year_level",
  "company", "job_title", "email", "mobile", "bio", "logo_path", "photo_path",
] as const;

function readValues(formData: FormData): WalletFormValues {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  let socialLinks: WalletFormValues["social_links"] = [];
  try {
    const parsed: unknown = JSON.parse(text("social_links") || "[]");
    if (Array.isArray(parsed)) socialLinks = parsed;
  } catch {
    // Left empty; the schema accepts [] and the owner simply re-adds links.
  }
  const values = Object.fromEntries(TEXT_FIELDS.map((key) => [key, text(key)])) as Record<
    (typeof TEXT_FIELDS)[number],
    string
  >;
  return {
    ...values,
    profile_type: text("profile_type") === "professional" ? "professional" : "student",
    show_email: formData.get("show_email") === "on",
    show_mobile: formData.get("show_mobile") === "on",
    social_links: socialLinks,
  };
}

/** Validates a submitted wallet form for `ownerId` and maps it to a database row. */
export function parseWalletForm(formData: FormData, ownerId: string): ParsedWalletForm {
  const values = readValues(formData);
  const result = walletFormSchema.safeParse({ ...values, profile_type: formData.get("profile_type") });

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) errors[issue.path.join(".") || "form"] ??= issue.message;
    return { ok: false, errors, values };
  }

  const data = result.data;
  // Storage policies only guard writes; this stops a wallet pointing at someone else's file.
  if (data.logo_path && !data.logo_path.startsWith(`${ownerId}/`)) {
    return { ok: false, errors: { logo_path: "Invalid logo" }, values };
  }
  if (data.photo_path && !data.photo_path.startsWith(`${ownerId}/`)) {
    return { ok: false, errors: { photo_path: "Invalid photo" }, values };
  }

  const isStudent = data.profile_type === "student";
  return {
    ok: true,
    values,
    row: {
      first_name: data.first_name,
      middle_name: data.middle_name ?? null,
      last_name: data.last_name,
      profile_type: data.profile_type,
      school: isStudent ? data.school : null,
      year_level: isStudent ? data.year_level : null,
      company: isStudent ? null : data.company,
      job_title: isStudent ? null : data.job_title,
      logo_path: data.logo_path ?? null,
      photo_path: data.photo_path ?? null,
      email: data.email ?? null,
      mobile: data.mobile ?? null,
      social_links: data.social_links,
      bio: data.bio ?? null,
      show_email: data.show_email,
      show_mobile: data.show_mobile,
    },
  };
}

export const EMPTY_WALLET_VALUES: WalletFormValues = {
  profile_type: "student",
  first_name: "",
  middle_name: "",
  last_name: "",
  school: "",
  year_level: "",
  company: "",
  job_title: "",
  email: "",
  mobile: "",
  bio: "",
  logo_path: "",
  photo_path: "",
  show_email: false,
  show_mobile: false,
  social_links: [],
};

/** Saved row → form defaults (nulls become empty strings). */
export function toFormValues(wallet: WalletRow): WalletFormValues {
  return {
    profile_type: wallet.profile_type,
    first_name: wallet.first_name,
    middle_name: wallet.middle_name ?? "",
    last_name: wallet.last_name,
    school: wallet.school ?? "",
    year_level: wallet.year_level ?? "",
    company: wallet.company ?? "",
    job_title: wallet.job_title ?? "",
    email: wallet.email ?? "",
    mobile: wallet.mobile ?? "",
    bio: wallet.bio ?? "",
    logo_path: wallet.logo_path ?? "",
    photo_path: wallet.photo_path ?? "",
    show_email: wallet.show_email,
    show_mobile: wallet.show_mobile,
    social_links: wallet.social_links,
  };
}
