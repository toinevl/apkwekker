import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { withCors, handlePreflight } from "../lib/cors";
import { isValidKenteken, normalizeKenteken, formatKenteken } from "../lib/kenteken";
import { getVehicle, RdwError } from "../lib/rdw";
import { getTableClient, ensureTable, SubscriptionEntity } from "../lib/storage";
import { getEmailSender } from "../lib/emailClient";
import { confirmationEmail } from "../lib/templates";
import { clientIp, isRateLimited } from "../lib/rateLimit";
import { baseUrl } from "../lib/config";

const bodySchema = z
  .object({
    kenteken: z.string().min(1, "Kenteken is verplicht."),
    email: z.string().email("Vul een geldig e-mailadres in."),
  })
  .strict();

export async function subscribeHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (isRateLimited(clientIp(req.headers))) {
    return withCors(req, {
      status: 429,
      jsonBody: { error: "Te veel aanmeldingen. Probeer het over een uur opnieuw." },
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return withCors(req, { status: 400, jsonBody: { error: "Ongeldige aanvraag." } });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Ongeldige aanvraag.";
    return withCors(req, { status: 400, jsonBody: { error: msg } });
  }

  const { email } = parsed.data;
  if (!isValidKenteken(parsed.data.kenteken)) {
    return withCors(req, { status: 400, jsonBody: { error: "Ongeldig kenteken." } });
  }
  const kenteken = normalizeKenteken(parsed.data.kenteken);

  try {
    const passport = await getVehicle(kenteken);

    await ensureTable();
    const table = getTableClient();
    const rowKey = createHash("sha256").update(email.toLowerCase()).digest("hex");

    let existing: SubscriptionEntity | null = null;
    try {
      existing = await table.getEntity<SubscriptionEntity>(kenteken, rowKey);
    } catch {
      // not found is fine
    }

    if (existing && existing.status === "confirmed") {
      return withCors(req, { status: 200, jsonBody: { message: "Je bent al aangemeld voor dit kenteken." } });
    }

    const entity: SubscriptionEntity = existing ?? {
      partitionKey: kenteken,
      rowKey,
      email,
      kenteken,
      apkDate: passport.vervaldatum_apk ?? "",
      status: "pending",
      confirmToken: randomUUID(),
      unsubscribeToken: randomUUID(),
      createdAt: new Date().toISOString(),
      confirmedAt: "",
      remindersSent: "",
    };
    entity.apkDate = passport.vervaldatum_apk ?? "";
    await table.upsertEntity(entity, "Replace");

    const confirmUrl = `${baseUrl()}/api/confirm?token=${entity.confirmToken}`;
    const mail = confirmationEmail(formatKenteken(kenteken), confirmUrl);
    await getEmailSender().send({ to: email, ...mail });

    return withCors(req, { status: 200, jsonBody: { message: "Check je inbox om je aanmelding te bevestigen." } });
  } catch (err) {
    if (err instanceof RdwError) {
      const status = err.code === "NOT_FOUND" ? 404 : 502;
      return withCors(req, { status, jsonBody: { error: err.message } });
    }
    context.error("subscribe failed", err);
    return withCors(req, { status: 500, jsonBody: { error: "Er ging iets mis. Probeer het later opnieuw." } });
  }
}

app.http("subscribe", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "subscribe",
  handler: subscribeHandler,
});
