import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, resetRateLimits, clientIp } from "../src/lib/rateLimit";

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());

  it("allows 5 requests then blocks the 6th within the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("1.2.3.4", t0 + i)).toBe(false);
    }
    expect(isRateLimited("1.2.3.4", t0 + 5)).toBe(true);
  });

  it("resets after the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 6; i++) isRateLimited("1.2.3.4", t0);
    expect(isRateLimited("1.2.3.4", t0 + 60 * 60 * 1000)).toBe(false);
  });

  it("tracks IPs independently", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 6; i++) isRateLimited("1.1.1.1", t0);
    expect(isRateLimited("2.2.2.2", t0)).toBe(false);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const headers = new Map([["x-forwarded-for", "9.9.9.9, 10.0.0.1"]]);
    expect(clientIp({ get: (n) => headers.get(n) ?? null })).toBe("9.9.9.9");
  });
  it("falls back to unknown", () => {
    expect(clientIp({ get: () => null })).toBe("unknown");
  });
});
