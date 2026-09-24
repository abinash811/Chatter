import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// Node's built-in crypto.scrypt — deliberately no bcrypt/argon2
// dependency. scrypt is a well-regarded, memory-hard KDF (used by many
// production systems) and ships in Node core, so it avoids adding a
// native-binary dependency — exactly the kind of platform-specific
// install friction (Homebrew pgvector targeting the wrong Postgres
// version) already hit once this session.

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, KEY_LENGTH);
  // timingSafeEqual requires equal-length buffers, and throws otherwise
  // — check length first rather than let a malformed stored hash throw.
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer);
}
