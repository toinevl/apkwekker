import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { corsHeaders, handlePreflight } from "../src/lib/cors";

function req(origin: string | null, method = "GET") {
  return {
    method,
    headers: { get: (n: string) => (n.toLowerCase() === "origin" ? origin : null) },
  } as never;
}

const ORIGINAL = process.env.ALLOWED_ORIGINS;
const ORIGINAL_FLAG = process.env.APP_LEVEL_CORS;

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = "https://apkwekker.autos,https://apkwekker.stoncoo.com";
  delete process.env.APP_LEVEL_CORS;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = ORIGINAL;
  if (ORIGINAL_FLAG === undefined) delete process.env.APP_LEVEL_CORS;
  else process.env.APP_LEVEL_CORS = ORIGINAL_FLAG;
});

describe("APP_LEVEL_CORS flag", () => {
  it("default ('on'): allowed origin gets CORS headers", () => {
    const h = corsHeaders(req("https://apkwekker.autos"));
    expect(h["Access-Control-Allow-Origin"]).toBe("https://apkwekker.autos");
  });

  it("'off': no CORS headers on actual responses", () => {
    process.env.APP_LEVEL_CORS = "off";
    const h = corsHeaders(req("https://apkwekker.autos"));
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(Object.keys(h)).toHaveLength(0);
  });

  it("'off': preflight still returns 204 but without CORS headers", () => {
    process.env.APP_LEVEL_CORS = "off";
    const res = handlePreflight(req("https://apkwekker.autos", "OPTIONS"));
    expect(res?.status).toBe(204);
    expect((res?.headers as Record<string, string>)["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("'on': preflight carries CORS headers", () => {
    const res = handlePreflight(req("https://apkwekker.autos", "OPTIONS"));
    expect(res?.status).toBe(204);
    expect((res?.headers as Record<string, string>)["Access-Control-Allow-Origin"]).toBe("https://apkwekker.autos");
  });
});
