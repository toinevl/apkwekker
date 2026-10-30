import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createHash } from "crypto";
import { withCors, handlePreflight } from "../lib/cors";
import { ensureTable, getRunsTableClient } from "../lib/storage";

interface HeartbeatRow {
  date: string;
  checked: number;
  sent: number;
  errors: number;
  finishedAt: string;
}

/** Timing-safe secret comparison via sha256 hashes. */
function verifySecret(provided: string | null, expectedEnv: string): boolean {
  if (!provided) return false;
  const expected = process.env[expectedEnv];
  if (!expected) return false;
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return providedHash.equals(expectedHash);
}

export async function reminderStatusHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return withCors(req, { status: 405, jsonBody: { error: "Alleen GET is toegestaan." } });
  }

  // Check secret
  const provided = req.headers.get("x-trigger-secret");
  if (!verifySecret(provided, "REMINDER_TRIGGER_SECRET")) {
    if (!process.env.REMINDER_TRIGGER_SECRET) {
      return withCors(req, { status: 503, jsonBody: { error: "Trigger niet geconfigureerd." } });
    }
    return withCors(req, { status: 401, jsonBody: { error: "Ongeldig geheim." } });
  }

  try {
    await ensureTable();
    const table = getRunsTableClient();
    const results: HeartbeatRow[] = [];

    // Query partitionKey='heartbeat', get all rows
    const iter = table.listEntities<Record<string, unknown>>({
      queryOptions: { filter: "PartitionKey eq 'heartbeat'" },
    });

    for await (const entity of iter) {
      results.push({
        date: entity.rowKey as string,
        checked: Number(entity.checked ?? 0),
        sent: Number(entity.sent ?? 0),
        errors: Number(entity.errors ?? 0),
        finishedAt: (entity.finishedAt as string) ?? "",
      });
    }

    // Sort newest first, take last 7
    results.sort((a, b) => b.date.localeCompare(a.date));
    return withCors(req, { status: 200, jsonBody: results.slice(0, 7) });
  } catch (err) {
    context.error("reminderStatus failed", err);
    return withCors(req, { status: 500, jsonBody: { error: "Er ging iets mis. Probeer het later opnieuw." } });
  }
}

app.http("reminderStatus", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "reminders/status",
  handler: reminderStatusHandler,
});