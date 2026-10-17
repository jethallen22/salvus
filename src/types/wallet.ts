import type { SocialPlatform } from "@/constants/social-platforms";

export type ProfileType = "student" | "professional";

export type SocialLink = { platform: SocialPlatform; url: string };

/** Editable profile fields, shared by the form, the database row and the public page. */
export type WalletProfile = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  profile_type: ProfileType;
  school: string | null;
  year_level: string | null;
  company: string | null;
  job_title: string | null;
  logo_path: string | null;
  photo_path: string | null;
  email: string | null;
  mobile: string | null;
  social_links: SocialLink[];
  bio: string | null;
};

/** A row of public.wallets as the owner sees it. */
export type Wallet = WalletProfile & {
  id: string;
  owner_id: string;
  token_encrypted: string;
  show_email: boolean;
  show_mobile: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** What get_public_wallet() returns: email/mobile are already null unless the owner opted in. */
export type PublicWallet = WalletProfile;
