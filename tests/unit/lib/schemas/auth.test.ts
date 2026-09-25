import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "@/lib/schemas/auth";

describe("loginSchema", () => {
  it("accepts a valid email/password and lowercases+trims the email", () => {
    const result = loginSchema.parse({ email: "  Test@Example.com  ", password: "anything" });
    expect(result.email).toBe("test@example.com");
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const base = { email: "a@b.com", password: "longenough1" };

  it("accepts matching passwords", () => {
    expect(signupSchema.safeParse({ ...base, confirmPassword: "longenough1" }).success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: "short", confirmPassword: "short" }).success).toBe(
      false,
    );
  });

  it("rejects mismatched passwords, flagged on confirmPassword", () => {
    const result = signupSchema.safeParse({ ...base, confirmPassword: "different1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
      expect(result.error.issues[0].message).toContain("don't match");
    }
  });
});
