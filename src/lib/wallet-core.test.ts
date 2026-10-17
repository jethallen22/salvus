import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptToken, encryptToken, hashToken, isWellFormedToken, newWalletToken } from "@/lib/crypto/token";
import { normalizePhMobile, parseWalletForm, urlMatchesPlatform } from "@/lib/validation/wallet";
import { buildVCard } from "@/lib/vcard";

const OWNER = "11111111-2222-3333-4444-555555555555";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const student = {
  profile_type: "student",
  first_name: "Juan",
  last_name: "Dela Cruz",
  school: "Ateneo",
  year_level: "2nd Year College",
  social_links: "[]",
};

beforeAll(() => {
  process.env.TOKEN_ENC_KEY = randomBytes(32).toString("base64");
});

describe("tap tokens", () => {
  it("round-trips and stores only a hash + ciphertext", () => {
    const { token, token_hash, token_encrypted } = newWalletToken();
    expect(isWellFormedToken(token)).toBe(true);
    expect(token_hash).toBe(hashToken(token));
    expect(token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(decryptToken(token_encrypted)).toBe(token);
    expect(encryptToken(token)).not.toBe(token_encrypted); // fresh IV each time
  });

  it("rejects tampered ciphertext and a different key", () => {
    const { token_encrypted } = newWalletToken();
    const bytes = Buffer.from(token_encrypted, "base64url");
    bytes[bytes.length - 1] ^= 1;
    expect(() => decryptToken(bytes.toString("base64url"))).toThrow();

    process.env.TOKEN_ENC_KEY = randomBytes(32).toString("base64");
    expect(() => decryptToken(token_encrypted)).toThrow();
  });

  it("only accepts 22-char base64url tokens", () => {
    expect(isWellFormedToken("../../etc/passwd")).toBe(false);
    expect(isWellFormedToken("a".repeat(23))).toBe(false);
  });
});

describe("form validation", () => {
  it("normalizes PH mobile numbers", () => {
    expect(normalizePhMobile("0917 123 4567")).toBe("+639171234567");
    expect(normalizePhMobile("639171234567")).toBe("+639171234567");
    expect(normalizePhMobile("+63 917-123-4567")).toBe("+639171234567");
  });

  it("matches social links to their platform's hosts over https only", () => {
    expect(urlMatchesPlatform("https://www.instagram.com/juan", "instagram")).toBe(true);
    expect(urlMatchesPlatform("https://m.facebook.com/juan", "facebook")).toBe(true);
    expect(urlMatchesPlatform("https://instagram.com.evil.example/juan", "instagram")).toBe(false);
    expect(urlMatchesPlatform("http://instagram.com/juan", "instagram")).toBe(false);
    expect(urlMatchesPlatform("javascript:alert(1)", "instagram")).toBe(false);
  });

  it("maps a student to a row and clears the professional pair", () => {
    const result = parseWalletForm(form({ ...student, company: "Leftover Inc", mobile: "0917 123 4567", show_mobile: "on" }), OWNER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row).toMatchObject({ school: "Ateneo", company: null, job_title: null, mobile: "+639171234567", show_mobile: true, show_email: false, middle_name: null });
  });

  it("reports field errors and echoes values back", () => {
    const result = parseWalletForm(
      form({ ...student, first_name: "", year_level: "Grade 99", social_links: JSON.stringify([{ platform: "x", url: "https://evil.example/a" }]) }),
      OWNER,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(["first_name", "year_level", "social_links.0.url"]));
    expect(result.values.school).toBe("Ateneo");
  });

  it("refuses a logo or photo that belongs to another owner", () => {
    const other = "99999999-2222-3333-4444-555555555555/image.webp";
    expect(parseWalletForm(form({ ...student, logo_path: other }), OWNER).ok).toBe(false);
    expect(parseWalletForm(form({ ...student, photo_path: other }), OWNER).ok).toBe(false);

    const own = parseWalletForm(form({ ...student, photo_path: `${OWNER}/me.webp` }), OWNER);
    expect(own.ok && own.row.photo_path).toBe(`${OWNER}/me.webp`);
  });
});

describe("vCard", () => {
  it("escapes values so a bio can't inject extra lines", () => {
    const card = buildVCard({
      first_name: "Juan", middle_name: null, last_name: "Dela Cruz", profile_type: "student",
      school: "Ateneo", year_level: "2nd Year College", company: null, job_title: null, logo_path: null, photo_path: null,
      email: null, mobile: null, social_links: [], bio: "Hi;\nEMAIL:attacker@example.com",
    });
    expect(card).toContain("NOTE:Hi\\;\\nEMAIL:attacker@example.com\r\n");
    expect(card.split("\r\n").filter((line) => line.startsWith("EMAIL"))).toHaveLength(0);
  });
});
