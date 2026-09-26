import { describe, it, expect, beforeEach } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

// A real 32-byte key, base64 — not the "..." placeholder .env ships
// with, so these tests actually exercise AES-256-GCM, not just check
// that the functions exist.
beforeEach(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("encrypt/decrypt", () => {
  it("round-trips a plaintext string", () => {
    const ciphertext = encrypt("sk-ant-real-secret-value");
    expect(ciphertext).not.toContain("sk-ant-real-secret-value");
    expect(decrypt(ciphertext)).toBe("sk-ant-real-secret-value");
  });

  it("produces a different ciphertext each time (random IV), same plaintext both times", () => {
    const a = encrypt("same input");
    const b = encrypt("same input");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same input");
    expect(decrypt(b)).toBe("same input");
  });

  it("fails closed on a tampered ciphertext instead of returning garbage", () => {
    const ciphertext = encrypt("secret");
    const tampered = ciphertext.slice(0, -4) + "abcd";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws a clear error when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("anything")).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws a clear error when ENCRYPTION_KEY isn't 32 bytes", () => {
    process.env.ENCRYPTION_KEY = Buffer.from("too short").toString("base64");
    expect(() => encrypt("anything")).toThrow(/32 bytes/);
  });
});
