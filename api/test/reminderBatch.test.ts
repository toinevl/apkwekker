import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@azure/functions", () => ({
  app: { http: vi.fn(), timer: vi.fn() },
}));

// Storage is fully mocked: we control listConfirmed and capture upserts on both tables.
vi.mock("../src/lib/storage", () => ({
  ensureTable: vi.fn(async () => {}),
  ensureRunsTable: vi.fn(async () => {}),
  getTableClient: vi.fn(() => subscriptionsTable),
  getRunsTableClient: vi.fn(() => runsTable),
  listConfirmed: vi.fn(),
}));

import { runReminderBatch } from "../src/lib/reminders";
import { listConfirmed } from "../src/lib/storage";
import { setEmailSender, OutgoingEmail } from "../src/lib/emailClient";

const { subscriptionsTable, runsTable } = vi.hoisted(() => {
  const mk = () => ({ upsertEntity: vi.fn(async (_e: Record<string, unknown>) => {}) });
  return { subscriptionsTable: mk(), runsTable: mk() };
});

function mockContext() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    invocationId: "test",
  } as never;
}

function sub(overrides: Partial<Record<string, unknown>> = {}) {
  const apkDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return {
    partitionKey: "00JTB5",
    rowKey: "hash-a",
    kenteken: "00JTB5",
    email: "toine@example.nl",
    apkDate,
    status: "confirmed" as const,
    confirmToken: "ct",
    unsubscribeToken: "ut",
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    remindersSent: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(listConfirmed).mockReset();
  subscriptionsTable.upsertEntity.mockClear();
  runsTable.upsertEntity.mockClear();
  // RDW refresh returns the same date the sub already has → no refresh branch.
  const row = { vervaldatum_apk_dt: `${sub().apkDate}T00:00:00.000` };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => [row] }))
  );
});

afterEach(() => {
  setEmailSender(null);
  vi.unstubAllGlobals();
});

describe("runReminderBatch", () => {
  it("sends due reminder, updates remindersSent, and writes a heartbeat row", async () => {
    const s = sub();
    vi.mocked(listConfirmed).mockResolvedValue([s]);
    const sent: OutgoingEmail[] = [];
    setEmailSender({ send: async (m) => { sent.push(m); } });

    const result = await runReminderBatch(mockContext());

    expect(result).toEqual({ checked: 1, sent: 1, errors: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("toine@example.nl");
    expect(sent[0].subject).toContain("00-JTB-5");
    // remindersSent persisted with the due threshold (30 days out → the 60-day threshold fires first)
    expect(subscriptionsTable.upsertEntity).toHaveBeenCalledTimes(1);
    const persisted = subscriptionsTable.upsertEntity.mock.calls[0][0] as { remindersSent: string };
    expect(persisted.remindersSent).toBe("60");
    // heartbeat row
    expect(runsTable.upsertEntity).toHaveBeenCalledTimes(1);
    const hb = runsTable.upsertEntity.mock.calls[0][0] as { partitionKey: string; rowKey: string; checked: number; sent: number; errors: number };
    expect(hb.partitionKey).toBe("heartbeat");
    expect(hb.rowKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(hb.checked).toBe(1);
    expect(hb.sent).toBe(1);
    expect(hb.errors).toBe(0);
  });

  it("does not resend an already-sent threshold (idempotent double trigger)", async () => {
    const s = sub({ remindersSent: "60,30,7" });
    vi.mocked(listConfirmed).mockResolvedValue([s]);
    const sent: OutgoingEmail[] = [];
    setEmailSender({ send: async (m) => { sent.push(m); } });

    const result = await runReminderBatch(mockContext());

    expect(result).toEqual({ checked: 1, sent: 0, errors: 0 });
    expect(sent).toHaveLength(0);
    expect(subscriptionsTable.upsertEntity).not.toHaveBeenCalled();
    // heartbeat is still written on a zero-send day
    expect(runsTable.upsertEntity).toHaveBeenCalledTimes(1);
  });

  it("continues when the heartbeat write fails (fail-open)", async () => {
    const s = sub();
    vi.mocked(listConfirmed).mockResolvedValue([s]);
    setEmailSender({ send: async () => {} });
    runsTable.upsertEntity.mockRejectedValue(new Error("storage down"));

    const result = await runReminderBatch(mockContext());

    expect(result).toEqual({ checked: 1, sent: 1, errors: 0 });
  });

  it("isolates per-row errors: one failing send does not abort the batch", async () => {
    const a = sub({ rowKey: "hash-a", email: "a@example.nl" });
    const b = sub({ partitionKey: "1KNG24", rowKey: "hash-b", kenteken: "1KNG24", email: "b@example.nl" });
    vi.mocked(listConfirmed).mockResolvedValue([a, b]);
    setEmailSender({
      send: async (m) => {
        if (m.to === "a@example.nl") throw new Error("acs down");
      },
    });

    const result = await runReminderBatch(mockContext());

    expect(result).toEqual({ checked: 2, sent: 1, errors: 1 });
    expect(runsTable.upsertEntity).toHaveBeenCalledTimes(1);
  });
});
