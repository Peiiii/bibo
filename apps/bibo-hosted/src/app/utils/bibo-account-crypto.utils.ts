const encoder = new TextEncoder();
const encoded = (bytes: ArrayBuffer | Uint8Array): string => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString("base64url");
export const accountRandom = (length = 32): string => encoded(crypto.getRandomValues(new Uint8Array(length)));
export const accountDigest = async (value: string): Promise<string> => encoded(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
export async function accountPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return encoded(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: Buffer.from(salt, "base64url"), iterations: 100_000, hash: "SHA-256" }, key, 256));
}
export async function accountCodeHash(secret: string, email: string, purpose: string, code: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encoded(await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify([email, purpose, code]))));
}
export function accountEqual(left: string, right: string): boolean {
  const a = encoder.encode(left); const b = encoder.encode(right);
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) different |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return different === 0;
}
