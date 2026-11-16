import * as argon2 from "argon2";

/** Argon2id settings for every stored password (OWASP: memory-hard). */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
} as const;

/** Hashes a new password for storage. Never store or log the plain text. */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Checks a password against a stored hash. With no hash (unknown email) it
 * still runs a full verification against a throwaway hash and returns false,
 * so the response time does not reveal whether the account exists.
 */
export async function verifyPassword(hash: string | null | undefined, plain: string): Promise<boolean> {
  if (!hash) {
    dummyHash ??= hashPassword("not-a-real-password");
    await argon2.verify(await dummyHash, plain).catch(() => false);
    return false;
  }
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false; // malformed stored hash
  }
}
