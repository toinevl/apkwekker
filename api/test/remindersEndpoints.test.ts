import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@azure/functions", () => ({
  app: { http: vi.fn(), timer: vi.fn() },
}));

// The handlers under test call runReminderBatch — mock the batch itself;
// batch behavior (heartbeat, sends) is covered in reminderBatch.test.ts.
vi.mock("../src/lib/reminders", () => ({
  runReminderBatch: vi.fn(),
}));

import { runRemindersHandler } from "../src/functions/runReminders";
import { reminderStatusHandler } from "../src/functions/reminderStatus";
import { runReminderBatch } from "../src/lib/reminders";
import { setTableClient, setRunsTableClient } from "../src/lib/storage";

const SECRET = "test-secret-value";

function mockContext() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    invocationId: "test",
  } as never;
}

function mockRequest(overrides: Partial<{ method: string; headers: Record<string, string> }> = {}) {
  const headers = new Map(Object.entries(overrides.headers ?? {}));
  return {
    method: overrides.method ?? "GET",
    query: new Map(),
    headers: { get: (n: string) => headers.get(n.toLowerCase()) ?? null },
  } as never;
}

function mockTableWithList(entities: Record<string, unknown>[]) {
  return {
    listEntities: vi.fn(async function* () {
      for (const e of entities) yield e;
    }),
  };
}

beforeEach(() => {
  vi.mocked(runReminderBatch).mockReset();
  process.env.REMINDER_TRIGGER_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.REMINDER_TRIGGER_SECRET;
  setTableClient(null);
  setRunsTableClient(null);
  vi.unstubAllGlobals();
});

describe("runRemindersHandler", () => {
  it("401 without secret header", async () => {
    const res = await runRemindersHandler(mockRequest({ method: "POST" }), mockContext());
    expect(res.status).toBe(401);
    expect((res.jsonBody as { error: string }).error).toBe("Ongeldig geheim.");
  });

  it("401 with wrong secret", async () => {
    const res = await runRemindersHandler(
      mockRequest({ method: "POST", headers: { "x-trigger-secret": "wrong" } }),
      mockContext()
    );
    expect(res.status).toBe(401);
  });

  it("503 fail-closed when env is unset", async () => {
    delete process.env.REMINDER_TRIGGER_SECRET;
    const res = await runRemindersHandler(
      mockRequest({ method: "POST", headers: { "x-trigger-secret": SECRET } }),
      mockContext()
    );
    expect(res.status).toBe(503);
    expect((res.jsonBody as { error: string }).error).toBe("Trigger niet geconfigureerd.");
  });

  it("405 on GET", async () => {
    const res = await runRemindersHandler(
      mockRequest({ method: "GET", headers: { "x-trigger-secret": SECRET } }),
      mockContext()
    );
    expect(res.status).toBe(405);
  });

  it("200 and runs the batch with correct secret", async () => {
    vi.mocked(runReminderBatch).mockResolvedValue({ checked: 3, sent: 1, errors: 0 });
    const res = await runRemindersHandler(
      mockRequest({ method: "POST", headers: { "x-trigger-secret": SECRET } }),
      mockContext()
    );
    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual({ checked: 3, sent: 1, errors: 0 });
    expect(runReminderBatch).toHaveBeenCalledTimes(1);
  });
});

describe("reminderStatusHandler", () => {
  it("401 with wrong secret", async () => {
    const res = await reminderStatusHandler(
      mockRequest({ method: "GET", headers: { "x-trigger-secret": "nope" } }),
      mockContext()
    );
    expect(res.status).toBe(401);
  });

  it("503 fail-closed when env is unset", async () => {
    delete process.env.REMINDER_TRIGGER_SECRET;
    const res = await reminderStatusHandler(
      mockRequest({ method: "GET", headers: { "x-trigger-secret": SECRET } }),
      mockContext()
    );
    expect(res.status).toBe(503);
  });

  it("200 returns heartbeats newest first", async () => {
    setTableClient(mockTableWithList([]) as never);
    setRunsTableClient(
      mockTableWithList([
        { rowKey: "2026-10-29", checked: 2, sent: 1, errors: 0, finishedAt: "2026-10-29T06:30:05Z" },
        { rowKey: "2026-10-30", checked: 3, sent: 0, errors: 0, finishedAt: "2026-10-30T06:30:04Z" },
      ]) as never
    );
    const res = await reminderStatusHandler(
      mockRequest({ method: "GET", headers: { "x-trigger-secret": SECRET } }),
      mockContext()
    );
    expect(res.status).toBe(200);
    const rows = res.jsonBody as { date: string }[];
    expect(rows.map((r) => r.date)).toEqual(["2026-10-30", "2026-10-29"]);
  });

  it("500 when the runs table is unreachable", async () => {
    setTableClient(mockTableWithList([]) as never);
    setRunsTableClient({
      listEntities: vi.fn(() => { throw new Error("storage down"); }),
    } as never);
    const res = await reminderStatusHandler(
      mockRequest({ method: "GET", headers: { "x-trigger-secret": SECRET } }),
      mockContext()
    );
    expect(res.status).toBe(500);
  });
});
