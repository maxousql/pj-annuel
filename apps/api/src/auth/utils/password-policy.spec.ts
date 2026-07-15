import { isStrongPassword, normalizeEmail } from "./password-policy";

describe("password policy", () => {
  it("accepts passwords with enough length, letters and numbers", () => {
    expect(isStrongPassword("Password123")).toBe(true);
  });

  it("rejects short or single-class passwords", () => {
    expect(isStrongPassword("short1")).toBe(false);
    expect(isStrongPassword("passwordonly")).toBe(false);
    expect(isStrongPassword("1234567890")).toBe(false);
  });

  it("rejects passwords that bcrypt would silently truncate", () => {
    expect(isStrongPassword(`${"é".repeat(36)}A1`)).toBe(false);
    expect(isStrongPassword(`${"a".repeat(70)}A1`)).toBe(true);
  });

  it("normalizes emails before persistence", () => {
    expect(normalizeEmail(" USER@example.COM ")).toBe("user@example.com");
  });
});
