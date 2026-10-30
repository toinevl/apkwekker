import { app, InvocationContext, Timer } from "@azure/functions";
import { runReminderBatch, dueReminder } from "../lib/reminders";

export { dueReminder };

export async function sendRemindersHandler(_timer: Timer, context: InvocationContext): Promise<void> {
  await runReminderBatch(context);
}

app.timer("sendReminders", {
  schedule: "0 0 7 * * *",
  handler: sendRemindersHandler,
});
