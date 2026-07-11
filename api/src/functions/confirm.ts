import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ensureTable, findByToken, getTableClient } from "../lib/storage";
import { frontendUrl } from "../lib/config";

function redirect(to: string): HttpResponseInit {
  return { status: 302, headers: { Location: to } };
}

export async function confirmHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const token = req.query.get("token") ?? "";
  if (!token) return redirect(`${frontendUrl()}/ongeldig.html`);

  try {
    await ensureTable();
    const sub = await findByToken("confirmToken", token);
    if (!sub) return redirect(`${frontendUrl()}/ongeldig.html`);

    sub.status = "confirmed";
    sub.confirmedAt = new Date().toISOString();
    await getTableClient().upsertEntity(sub, "Replace");
    return redirect(`${frontendUrl()}/bevestigd.html`);
  } catch (err) {
    context.error("confirm failed", err);
    return redirect(`${frontendUrl()}/ongeldig.html`);
  }
}

app.http("confirm", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "confirm",
  handler: confirmHandler,
});
