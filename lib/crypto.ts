import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encryption at rest for secrets we store (Integration.accessToken,
// Org.anthropicApiKeyEncrypted) — ADR 0012. Node's built-in crypto, no
// new dependency. AES-256-GCM: authenticated encryption, so a tampered
// or corrupted ciphertext fails to decrypt instead of silently
// returning garbage.
//
// ENCRYPTION_KEY is a 32-byte key, base64-encoded — generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Stored ciphertext is "<iv>:<authTag>:<ciphertext>", each base64 —
// self-contained, so decrypt() never needs anything but the stored
// string and the env key.

function getKey(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY;
  if (!b64) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`);
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // GCM's recommended IV length
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decrypt(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed ciphertext — expected \"iv:authTag:ciphertext\"");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
