import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@azure/functions", () => ({
  app: { http: vi.fn(), timer: vi.fn() },
}));

import { vehicleHandler } from "../src/functions/vehicle";
import { subscribeHandler } from "../src/functions/subscribe";
import { dueReminder } from "../src/functions/sendReminders";
import { resetRateLimits } from "../src/lib/rateLimit";
import { clearRdwCache } from "../src/lib/rdw";
import { setEmailSender, OutgoingEmail } from "../src/lib/emailClient";
import { setTableClient } from "../src/lib/storage";

// Mirrors the real v4 InvocationContext shape: log is a plain function,
// error/warn are methods on the context itself (context.log.error does NOT exist).
function mockContext() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    invocationId: "test",
  } as never;
}

function mockRequest(overrides: Partial<{ method: string; params: Record<string, string>; body: unknown; headers: Record<string, string> }> = {}) {
  const headers = new Map(Object.entries(overrides.headers ?? {}));
  return {
    method: overrides.method ?? "GET",
    params: overrides.params ?? {},
    query: new Map(),
    headers: { get: (n: string) => headers.get(n.toLowerCase()) ?? null },
    json: async () => {
      if (overrides.body === undefined) throw new Error("no body");
      return overrides.body;
    },
  } as never;
}

const rdwVehicleRow = {
  kenteken: "00JTB5",
  merk: "VOLKSWAGEN",
  handelsbenaming: "FOX",
  vervaldatum_apk_dt: "2099-01-01T00:00:00.000",
};

function mockFetchOk() {
  return vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes("m9d7-ebf2") ? [rdwVehicleRow] : [{ brandstof_omschrijving: "Benzine" }]),
  }));
}

beforeEach(() => {
  resetRateLimits();
  clearRdwCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setEmailSender(null);
  setTableClient(null);
});

describe("vehicleHandler", () => {
  it("400 on invalid kenteken with Dutch message", async () => {
    const res = await vehicleHandler(mockRequest({ params: { kenteken: "XYZ" } }), mockContext());
    expect(res.status).toBe(400);
    expect((res.jsonBody as { error: string }).error).toBe("Ongeldig kenteken.");
  });

  it("404 on unknown kenteken", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
    const res = await vehicleHandler(mockRequest({ params: { kenteken: "ZZ99ZZ" } }), mockContext());
    expect(res.status).toBe(404);
    expect((res.jsonBody as { error: string }).error).toBe("Kenteken niet gevonden.");
  });

  it("502 when RDW is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom"); }));
    const res = await vehicleHandler(mockRequest({ params: { kenteken: "ZZ98ZZ" } }), mockContext());
    expect(res.status).toBe(502);
    expect((res.jsonBody as { error: string }).error).toBe("RDW is tijdelijk niet bereikbaar.");
  });

  it("200 with passport for a known kenteken", async () => {
    vi.stubGlobal("fetch", mockFetchOk());
    const res = await vehicleHandler(mockRequest({ params: { kenteken: "00-JTB-5" } }), mockContext());
    expect(res.status).toBe(200);
    const body = res.jsonBody as { kenteken: string; brandstof: string; apkStatus: string };
    expect(body.kenteken).toBe("00-JTB-5");
    expect(body.brandstof).toBe("Benzine");
    expect(body.apkStatus).toBe("geldig");
  });

  it("echoes allowed origin in CORS header", async () => {
    vi.stubGlobal("fetch", mockFetchOk());
    const res = await vehicleHandler(
      mockRequest({ params: { kenteken: "00JTB5" }, headers: { origin: "http://localhost:5173" } }),
      mockContext()
    );
    expect((res.headers as Record<string, string>)["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
  });

  it("handles OPTIONS preflight with 204", async () => {
    const res = await vehicleHandler(
      mockRequest({ method: "OPTIONS", params: { kenteken: "00JTB5" }, headers: { origin: "http://localhost:5173" } }),
      mockContext()
    );
    expect(res.status).toBe(204);
  });
});

describe("subscribeHandler", () => {
  function mockTable() {
    const store = new Map<string, Record<string, unknown>>();
    return {
      store,
      getEntity: vi.fn(async (pk: string, rk: string) => {
        const e = store.get(`${pk}/${rk}`);
        if (!e) { const err = new Error("not found") as Error & { statusCode: number }; err.statusCode = 404; throw err; }
        return e;
      }),
      upsertEntity: vi.fn(async (e: { partitionKey: string; rowKey: string }) => {
        store.set(`${e.partitionKey}/${e.rowKey}`, e as Record<string, unknown>);
      }),
    };
  }

  it("400 on invalid email", async () => {
    const res = await subscribeHandler(
      mockRequest({ method: "POST", body: { kenteken: "00JTB5", email: "not-an-email" } }),
      mockContext()
    );
    expect(res.status).toBe(400);
    expect((res.jsonBody as { error: string }).error).toBe("Vul een geldig e-mailadres in.");
  });

  it("400 on extra fields (strict schema)", async () => {
    const res = await subscribeHandler(
      mockRequest({ method: "POST", body: { kenteken: "00JTB5", email: "a@b.nl", extra: 1 } }),
      mockContext()
    );
    expect(res.status).toBe(400);
  });

  it("429 after 5 requests from one IP", async () => {
    const headers = { "x-forwarded-for": "5.5.5.5" };
    vi.stubGlobal("fetch", mockFetchOk());
    setTableClient(mockTable() as never);
    const sent: OutgoingEmail[] = [];
    setEmailSender({ send: async (m) => { sent.push(m); } });
    for (let i = 0; i < 5; i++) {
      await subscribeHandler(mockRequest({ method: "POST", body: { kenteken: "00JTB5", email: `u${i}@b.nl` }, headers }), mockContext());
    }
    const res = await subscribeHandler(
      mockRequest({ method: "POST", body: { kenteken: "00JTB5", email: "u6@b.nl" }, headers }),
      mockContext()
    );
    expect(res.status).toBe(429);
  });

  it("stores pending subscription and sends confirmation email", async () => {
    vi.stubGlobal("fetch", mockFetchOk());
    const table = mockTable();
    setTableClient(table as never);
    const sent: OutgoingEmail[] = [];
    setEmailSender({ send: async (m) => { sent.push(m); } });

    const res = await subscribeHandler(
      mockRequest({ method: "POST", body: { kenteken: "00-JTB-5", email: "toine@example.nl" } }),
      mockContext()
    );
    expect(res.status).toBe(200);
    expect((res.jsonBody as { message: string }).message).toContain("inbox");
    expect(table.store.size).toBe(1);
    const row = [...table.store.values()][0];
    expect(row.status).toBe("pending");
    expect(row.kenteken).toBe("00JTB5");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("toine@example.nl");
    expect(sent[0].subject).toContain("00-JTB-5");
    expect(sent[0].html).toContain("/api/confirm?token=");
  });

  it("is idempotent for already-confirmed subscriptions", async () => {
    vi.stubGlobal("fetch", mockFetchOk());
    const table = mockTable();
    setTableClient(table as never);
    const sent: OutgoingEmail[] = [];
    setEmailSender({ send: async (m) => { sent.push(m); } });

    const first = await subscribeHandler(
      mockRequest({ method: "POST", body: { kenteken: "00JTB5", email: "toine@example.nl" } }),
      mockContext()
    );
    expect(first.status).toBe(200);
    const row = [...table.store.values()][0];
    row.status = "confirmed";

    const res = await subscribeHandler(
      mockRequest({ method: "POST", body: { kenteken: "00JTB5", email: "toine@example.nl" } }),
      mockContext()
    );
    expect(res.status).toBe(200);
    expect((res.jsonBody as { message: string }).message).toBe("Je bent al aangemeld voor dit kenteken.");
    expect(sent).toHaveLength(1); // no second confirmation mail
  });
});

describe("dueReminder", () => {
  it("returns the largest unsent threshold that applies", () => {
    expect(dueReminder(55, new Set())).toBe(60);
    expect(dueReminder(55, new Set(["60"]))).toBeNull();
  });
  it("only counts thresholds the days actually crossed", () => {
    expect(dueReminder(45, new Set(["60"]))).toBeNull();
    expect(dueReminder(25, new Set(["60"]))).toBe(30);
    expect(dueReminder(5, new Set(["60", "30"]))).toBe(7);
  });
  it("sends expiry notice once", () => {
    expect(dueReminder(-1, new Set(["60", "30", "7"]))).toBe(0);
    expect(dueReminder(-1, new Set(["0"]))).toBeNull();
  });
  it("does nothing without a date", () => {
    expect(dueReminder(null, new Set())).toBeNull();
  });
});
