import { app, InvocationContext, Timer } from "@azure/functions";
import { ensureTable, getTableClient, listConfirmed, SubscriptionEntity } from "../lib/storage";
import { getVehicle, daysUntil, RdwError } from "../lib/rdw";
import { getEmailSender } from "../lib/emailClient";
import { reminderEmail } from "../lib/templates";
import { formatKenteken } from "../lib/kenteken";
import { baseUrl } from "../lib/config";

const THRESHOLDS = [60, 30, 7];

function sentSet(sub: SubscriptionEntity): Set<string> {
  return new Set(sub.remindersSent.split(",").filter(Boolean));
}

/** Decide which single reminder (if any) to send for a subscription. Pure — unit-testable. */
export function dueReminder(days: number | null, sent: Set<string>): number | null {
  if (days === null) return null;
  if (days < 0) return sent.has("0") ? null : 0;
  for (const t of THRESHOLDS) {
    if (days <= t && !sent.has(String(t))) return t;
  }
  return null;
}

export async function sendRemindersHandler(_timer: Timer, context: InvocationContext): Promise<void> {
  await ensureTable();
  const subs = await listConfirmed();
  const table = getTableClient();
  const sender = getEmailSender();

  let sent = 0;
  let errors = 0;

  for (const sub of subs) {
    try {
      // Refresh APK date from RDW — handles re-keuring (date moved forward)
      let apkDate = sub.apkDate;
      try {
        const passport = await getVehicle(sub.kenteken);
        const fresh = passport.vervaldatum_apk ?? "";
        if (fresh && fresh !== sub.apkDate) {
          if (sub.apkDate && new Date(fresh) > new Date(sub.apkDate)) {
            sub.remindersSent = ""; // re-keuring: start a fresh reminder cycle
          }
          sub.apkDate = fresh;
          apkDate = fresh;
          await table.upsertEntity(sub, "Replace");
        }
      } catch (err) {
        if (!(err instanceof RdwError)) throw err;
        // RDW hiccup or deregistered vehicle: fall back to stored date
      }

      const days = daysUntil(apkDate || null);
      const due = dueReminder(days, sentSet(sub));
      if (due === null) continue;

      const unsubscribeUrl = `${baseUrl()}/api/unsubscribe?token=${sub.unsubscribeToken}`;
      const mail = reminderEmail(
        {
          kenteken: formatKenteken(sub.kenteken),
          merk: null,
          handelsbenaming: null,
          vervaldatum_apk: apkDate || null,
        },
        days as number,
        unsubscribeUrl
      );
      await sender.send({ to: sub.email, ...mail });

      sub.remindersSent = [...sentSet(sub), String(due)].join(",");
      await table.upsertEntity(sub, "Replace");
      sent += 1;
    } catch (err) {
      errors += 1;
      context.error(`reminder failed for ${sub.partitionKey}/${sub.rowKey}`, err);
    }
  }

  context.log(`sendReminders done: ${subs.length} confirmed, ${sent} sent, ${errors} errors`);
}

app.timer("sendReminders", {
  schedule: "0 0 7 * * *",
  handler: sendRemindersHandler,
});
