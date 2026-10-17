import type { WalletProfile } from "@/types/wallet";

export function fullName(w: Pick<WalletProfile, "first_name" | "middle_name" | "last_name">): string {
  return [w.first_name, w.middle_name, w.last_name].filter(Boolean).join(" ");
}

/** [role, organization]: year level + school for students, job title + company otherwise. */
export function roleLine(
  w: Pick<WalletProfile, "profile_type" | "school" | "year_level" | "company" | "job_title">,
): [string | null, string | null] {
  return w.profile_type === "student" ? [w.year_level, w.school] : [w.job_title, w.company];
}

/** "https://www.instagram.com/jdoe/" → "instagram.com/jdoe" */
export function displayUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname.replace(/^www\./, "")}${pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

/** "+639171234567" → "+63 917 123 4567" */
export function formatMobile(mobile: string): string {
  return mobile.replace(/^\+63(\d{3})(\d{3})(\d{4})$/, "+63 $1 $2 $3");
}
