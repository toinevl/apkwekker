import { describe, it, expect } from "vitest";
import { normalizeKenteken, isValidKenteken, formatKenteken } from "../src/lib/kenteken";

describe("normalizeKenteken", () => {
  it("uppercases and strips dashes and spaces", () => {
    expect(normalizeKenteken("ab-12-cd")).toBe("AB12CD");
    expect(normalizeKenteken(" 12 abc 3 ")).toBe("12ABC3");
  });
});

describe("isValidKenteken", () => {
  it("accepts 6 alphanumeric chars in any dash/space arrangement", () => {
    expect(isValidKenteken("AB-12-CD")).toBe(true);
    expect(isValidKenteken("00jtb5")).toBe(true);
  });
  it("rejects wrong lengths and invalid chars", () => {
    expect(isValidKenteken("AB-12")).toBe(false);
    expect(isValidKenteken("ABCDEFG")).toBe(false);
    expect(isValidKenteken("AB!2CD")).toBe(false);
    expect(isValidKenteken("")).toBe(false);
  });
});

describe("formatKenteken", () => {
  it("joins letter/digit runs with dashes", () => {
    expect(formatKenteken("00JTB5")).toBe("00-JTB-5");
    expect(formatKenteken("ab12cd")).toBe("AB-12-CD");
    expect(formatKenteken("XX-99-XX")).toBe("XX-99-XX");
  });
});
