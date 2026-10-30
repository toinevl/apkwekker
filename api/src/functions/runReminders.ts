import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createHash } from "crypto";
import { withCors, handlePreflight } from "../lib/cors";
import { runReminderBatch } from "../lib/reminders";

/** Timing-safe secret comparison via sha256 digests. */
function verifySecret(provided: string | null, expectedEnv: string): boolean {
  if (!provided) return false;
  const expected = process.env[expectedEnv];
  if (!expected) return false;
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return providedHash.equals(expectedHash);
}

export async function runRemindersHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return withCors(req, { status: 405, jsonBody: { error: "Alleen POST is toegestaan." } });
  }

  // Check secret
  const provided = req.headers.get("x-trigger-secret");
  if (!verifySecret(provided, "REMINDER_TRIGGER_SECRET")) {
    // Env unset → 503 (fail-closed)
    if (!process.env.REMINDER_TRIGGER_SECRET) {
      return withCors(req, { status: 503, jsonBody: { error: "Trigger niet geconfigureerd." } });
    }
    return withCors(req, { status: 401, jsonBody: { error: "Ongeldig geheim." } });
  }

  const result = await runReminderBatch(context);
  return withCors(req, { status: 200, jsonBody: result });
}

app.http("runReminders", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "reminders/run",
  handler: runRemindersHandler,
});