import { EmailClient } from "@azure/communication-email";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  plainText: string;
}

export interface EmailSender {
  send(mail: OutgoingEmail): Promise<void>;
}

let overrideSender: EmailSender | null = null;

/** For tests: inject a mock sender. Pass null to restore default behavior. */
export function setEmailSender(sender: EmailSender | null): void {
  overrideSender = sender;
}

class AcsSender implements EmailSender {
  private client: EmailClient;
  private from: string;

  constructor(connectionString: string, from: string) {
    this.client = new EmailClient(connectionString);
    this.from = from;
  }

  async send(mail: OutgoingEmail): Promise<void> {
    const poller = await this.client.beginSend({
      senderAddress: this.from,
      content: { subject: mail.subject, html: mail.html, plainText: mail.plainText },
      recipients: { to: [{ address: mail.to }] },
    });
    await poller.pollUntilDone();
  }
}

class DevLogSender implements EmailSender {
  async send(mail: OutgoingEmail): Promise<void> {
    console.log(`[DEV EMAIL] to=${mail.to} subject="${mail.subject}"`);
  }
}

export function getEmailSender(): EmailSender {
  if (overrideSender) return overrideSender;
  const conn = process.env.ACS_CONNECTION;
  if (!conn) return new DevLogSender();
  const from = process.env.MAIL_FROM || "DoNotReply@example.com";
  return new AcsSender(conn, from);
}
