import { describe, it, expect } from "vitest";
import { validateFile, getFileExtension } from "../src/lib/storage";
import { generateToken, generateUUID } from "../src/lib/crypto";

describe("storage validation", () => {
  it("accepts valid image types", () => {
    const result = validateFile("image/jpeg", 1024);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.mediaType).toBe("image");
  });

  it("accepts valid video types", () => {
    const result = validateFile("video/mp4", 1024);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.mediaType).toBe("video");
  });

  it("rejects invalid types", () => {
    const result = validateFile("text/plain", 1024);
    expect(result.valid).toBe(false);
  });

  it("rejects oversized images", () => {
    const result = validateFile("image/jpeg", 11 * 1024 * 1024);
    expect(result.valid).toBe(false);
  });

  it("maps extensions correctly", () => {
    expect(getFileExtension("image/jpeg")).toBe("jpg");
    expect(getFileExtension("video/mp4")).toBe("mp4");
  });
});

describe("crypto", () => {
  it("generates unique tokens", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(32);
  });

  it("generates valid UUIDs", () => {
    const id = generateUUID();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
