import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ensureTable, findByToken, getTableClient } from "../lib/storage";
import { frontendUrl } from "../lib/config";

function redirect(to: string): HttpResponseInit {
  return { status: 302, headers: { Location: to } };
}

export async function unsubscribeHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const token = req.query.get("token") ?? "";
  if (!token) return redirect(`${frontendUrl()}/ongeldig.html`);

  try {
    await ensureTable();
    const sub = await findByToken("unsubscribeToken", token);
    if (!sub) return redirect(`${frontendUrl()}/ongeldig.html`);

    await getTableClient().deleteEntity(sub.partitionKey, sub.rowKey);
    return redirect(`${frontendUrl()}/afgemeld.html`);
  } catch (err) {
    context.error("unsubscribe failed", err);
    return redirect(`${frontendUrl()}/ongeldig.html`);
  }
}

app.http("unsubscribe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "unsubscribe",
  handler: unsubscribeHandler,
});
