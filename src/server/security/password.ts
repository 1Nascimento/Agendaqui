import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
  options?: { N: number; r: number; p: number }
) => Promise<Buffer>;
const KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, KEY_LENGTH);

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${Buffer.from(key).toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, n, r, p, salt, key] = storedHash.split("$");

  if (algorithm !== "scrypt" || n !== String(SCRYPT_N) || r !== String(SCRYPT_R) || p !== String(SCRYPT_P) || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "base64url");
  if (expected.length !== KEY_LENGTH) return false;
  const derived = (await scrypt(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  })) as Buffer;

  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
