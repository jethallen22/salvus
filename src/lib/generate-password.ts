// No look-alikes (0/O, 1/l/I) so a temporary password survives being read aloud or copied by hand.
export const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Cryptographically random password, without modulo bias. */
export function generatePassword(length = 14): string {
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  const byte = new Uint8Array(1);
  let password = "";
  while (password.length < length) {
    crypto.getRandomValues(byte);
    if (byte[0] < limit) password += PASSWORD_ALPHABET[byte[0] % PASSWORD_ALPHABET.length];
  }
  return password;
}
