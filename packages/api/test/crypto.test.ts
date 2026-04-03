import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken } from "../src/lib/crypto";

describe("crypto", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("mypassword123");
    expect(hash).not.toBe("mypassword123");
    expect(hash).toContain(":");

    const valid = await verifyPassword("mypassword123", hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("wrongpassword", hash);
    expect(invalid).toBe(false);
  });

  it("generates unique tokens", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(32);
  });
});
