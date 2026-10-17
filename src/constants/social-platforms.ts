// Allowed hosts per platform, so a link labelled "Facebook" can't point at a phishing site.
export const SOCIAL_PLATFORMS = {
  facebook: { label: "Facebook", hosts: ["facebook.com", "fb.com", "m.me"] },
  instagram: { label: "Instagram", hosts: ["instagram.com"] },
  x: { label: "X", hosts: ["x.com", "twitter.com"] },
  tiktok: { label: "TikTok", hosts: ["tiktok.com"] },
  linkedin: { label: "LinkedIn", hosts: ["linkedin.com"] },
  youtube: { label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
} as const;

export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

export const SOCIAL_PLATFORM_IDS = Object.keys(SOCIAL_PLATFORMS) as [SocialPlatform, ...SocialPlatform[]];

export const MAX_SOCIAL_LINKS = 8;
