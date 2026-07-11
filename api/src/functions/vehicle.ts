import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withCors, handlePreflight } from "../lib/cors";
import { isValidKenteken } from "../lib/kenteken";
import { getVehicle, RdwError } from "../lib/rdw";

export async function vehicleHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const kenteken = req.params.kenteken ?? "";
  if (!isValidKenteken(kenteken)) {
    return withCors(req, { status: 400, jsonBody: { error: "Ongeldig kenteken." } });
  }

  try {
    const passport = await getVehicle(kenteken);
    return withCors(req, { status: 200, jsonBody: passport });
  } catch (err) {
    if (err instanceof RdwError) {
      const status = err.code === "NOT_FOUND" ? 404 : 502;
      return withCors(req, { status, jsonBody: { error: err.message } });
    }
    context.error("vehicle lookup failed", err);
    return withCors(req, { status: 500, jsonBody: { error: "Er ging iets mis. Probeer het later opnieuw." } });
  }
}

app.http("vehicle", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "vehicle/{kenteken}",
  handler: vehicleHandler,
});
