import { describe, it, expect } from "vitest";
import { validateKosovoPhone, validateEmail, validatePassword } from "../../src/lib/validators";

describe("validateKosovoPhone", () => {
  it("pranon +38344123456", () => {
    expect(validateKosovoPhone("+38344123456")).toBe(true);
  });
  it("pranon +38345123456", () => {
    expect(validateKosovoPhone("+38345123456")).toBe(true);
  });
  it("pranon +38348123456", () => {
    expect(validateKosovoPhone("+38348123456")).toBe(true);
  });
  it("pranon +38349123456", () => {
    expect(validateKosovoPhone("+38349123456")).toBe(true);
  });
  it("pranon formatin lokal 044123456", () => {
    expect(validateKosovoPhone("044123456")).toBe(true);
  });
  it("refuzon +38341123456 — prefix i gabuar", () => {
    expect(validateKosovoPhone("+38341123456")).toBe(false);
  });
  it("refuzon numër tepër të shkurtër", () => {
    expect(validateKosovoPhone("04412345")).toBe(false);
  });
  it("refuzon string bosh", () => {
    expect(validateKosovoPhone("")).toBe(false);
  });
  it("refuzon karaktere jo-numerike", () => {
    expect(validateKosovoPhone("044abcdef")).toBe(false);
  });
});

describe("validateEmail", () => {
  it("pranon test@email.com", () => {
    expect(validateEmail("test@email.com")).toBe(true);
  });
  it("pranon user.name+tag@domain.co", () => {
    expect(validateEmail("user.name+tag@domain.co")).toBe(true);
  });
  it("refuzon 'notanemail'", () => {
    expect(validateEmail("notanemail")).toBe(false);
  });
  it("refuzon '@nodomain'", () => {
    expect(validateEmail("@nodomain")).toBe(false);
  });
  it("refuzon string bosh", () => {
    expect(validateEmail("")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("kthen valid: false për fjalëkalim nën 8 karaktere", () => {
    const result = validatePassword("Short1!");
    expect(result.valid).toBe(false);
  });
  it("kthen valid: true dhe strength: weak për 8+ karaktere pa numra/shkronja të mëdha", () => {
    const result = validatePassword("alllowercase");
    expect(result.valid).toBe(true);
    expect(result.strength).toBe("weak");
  });
  it("kthen strength: fair për 8+ karaktere me numër ose shkronjë të madhe", () => {
    const result = validatePassword("Password");
    expect(result.valid).toBe(true);
    expect(result.strength).toBe("fair");
  });
  it("kthen strength: strong për 12+ karaktere, shkronjë të madhe, numër dhe simbol", () => {
    const result = validatePassword("StrongPass123!");
    expect(result.valid).toBe(true);
    expect(result.strength).toBe("strong");
  });
});
