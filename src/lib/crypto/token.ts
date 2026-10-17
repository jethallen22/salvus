import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Tap URL token: 128 random bits, base64url (22 chars). Only its hash is used for lookup;
// an AES-256-GCM copy lets the owner's dashboard show the link again.
const IV_BYTES = 12;
const TAG_BYTES = 16;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function encryptionKey(): Buffer {
  const key = Buffer.from(process.env.TOKEN_ENC_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENC_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptToken(token: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function decryptToken(blob: string): string {
  const data = Buffer.from(blob, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, IV_BYTES));
  decipher.setAuthTag(data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(data.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}

/** A fresh token plus the two columns stored for it. */
export function newWalletToken() {
  const token = randomBytes(16).toString("base64url");
  return { token, token_hash: hashToken(token), token_encrypted: encryptToken(token) };
}
