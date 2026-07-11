import { describe, it, expect } from "vitest";
import { normalizeKenteken, isValidKenteken, formatKenteken } from "../src/lib/kenteken";

describe("normalizeKenteken", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeKenteken("xx-99-xx")).toBe("XX99XX");
    expect(normalizeKenteken(" 00 jtb 5 ")).toBe("00JTB5");
  });
});

describe("isValidKenteken", () => {
  it("accepts valid plates", () => {
    expect(isValidKenteken("XX-99-XX")).toBe(true);
    expect(isValidKenteken("00jtb5")).toBe(true);
  });
  it("rejects invalid plates", () => {
    expect(isValidKenteken("XX-99")).toBe(false);
    expect(isValidKenteken("1234567")).toBe(false);
    expect(isValidKenteken("")).toBe(false);
  });
});

describe("formatKenteken", () => {
  it("adds dashes between letter/digit groups", () => {
    expect(formatKenteken("00JTB5")).toBe("00-JTB-5");
    expect(formatKenteken("xx99xx")).toBe("XX-99-XX");
  });
});
