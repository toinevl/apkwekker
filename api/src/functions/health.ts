import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withCors, handlePreflight } from "../lib/cors";

export async function healthHandler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  return withCors(req, { status: 200, jsonBody: { status: "ok" } });
}

app.http("health", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "health",
  handler: healthHandler,
});
