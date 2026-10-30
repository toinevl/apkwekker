import { describe, it, expect, vi, afterEach } from "vitest";

const beginSendMock = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => ({ pollUntilDone: async () => {} }))
);

vi.mock("@azure/communication-email", () => ({
  EmailClient: class {
    beginSend = beginSendMock;
    constructor(_connectionString: string) {}
  },
}));

import { confirmationEmail, reminderEmail, listUnsubscribeHeaders } from "../src/lib/templates";
import { getEmailSender, setEmailSender } from "../src/lib/emailClient";

const UNSUB = "https://apkwekker.autos/api/unsubscribe?token=tok123";
const CONFIRM = "https://apkwekker.autos/api/confirm?token=tok456";

const passport = {
  kenteken: "XX-99-XX",
  merk: null,
  handelsbenaming: null,
  vervaldatum_apk: "2026-12-30",
};

afterEach(() => {
  setEmailSender(null);
  vi.unstubAllEnvs();
});

describe("listUnsubscribeHeaders", () => {
  it("geeft RFC 2369 + RFC 8058 one-click headers terug", () => {
    const headers = listUnsubscribeHeaders(UNSUB);
    expect(headers["List-Unsubscribe"]).toBe(`<${UNSUB}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("confirmationEmail", () => {
  it("bevat kenteken, bevestiglink en List-Unsubscribe headers", () => {
    const mail = confirmationEmail("XX-99-XX", CONFIRM, UNSUB);
    expect(mail.plainText).toContain("XX-99-XX");
    expect(mail.plainText).toContain(CONFIRM);
    expect(mail.html).toContain(CONFIRM);
    expect(mail.headers["List-Unsubscribe"]).toBe(`<${UNSUB}>`);
    expect(mail.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("vermeldt de 60/30/7-dagen-belofte in html en plainText", () => {
    const mail = confirmationEmail("XX-99-XX", CONFIRM, UNSUB);
    expect(mail.html).toContain("60, 30 en 7 dagen");
    expect(mail.plainText).toContain("60, 30 en 7 dagen");
  });
});

describe("reminderEmail plainText (herstel: kenteken + vervaldatum + afmeldlink)", () => {
  it("vermeldt bij een normale reminder kenteken, vervaldatum en afmeldlink", () => {
    const mail = reminderEmail(passport, 30, UNSUB);
    expect(mail.plainText).toContain("XX-99-XX");
    expect(mail.plainText).toContain("2026-12-30");
    expect(mail.plainText).toContain(UNSUB);
  });

  it("vermeldt bij de verlopen-variant kenteken, vervaldatum en afmeldlink", () => {
    const mail = reminderEmail(passport, -3, UNSUB);
    expect(mail.plainText).toContain("XX-99-XX");
    expect(mail.plainText).toContain("2026-12-30");
    expect(mail.plainText).toContain(UNSUB);
    expect(mail.plainText).toContain("€190");
    expect(mail.plainText).toContain("keuringsafspraak");
  });
});

describe("reminderEmail CTA en viral-voettekst", () => {
  it("bevat CTA-knop en de doorstuur-voettekst in de html", () => {
    const mail = reminderEmail(passport, 60, UNSUB);
    expect(mail.html).toContain("https://apkwekker.autos/");
    expect(mail.html).toMatch(/Doorsturen|Stuur deze mail door/);
    expect(mail.html).toContain("😉");
  });
});

describe("ACS-verzoek krijgt List-Unsubscribe headers mee", () => {
  it("AcsSender stuurt headers door in het EmailMessage", async () => {
    vi.stubEnv("ACS_CONNECTION", "endpoint=https://acs.example/;accesskey=a2V5");
    const sender = getEmailSender();
    beginSendMock.mockClear();

    const mail = reminderEmail(passport, 7, UNSUB);
    await sender.send({ to: "toine@example.nl", ...mail });

    expect(beginSendMock).toHaveBeenCalledTimes(1);
    const payload = beginSendMock.mock.calls[0][0] as unknown as {
      headers: Record<string, string>;
      content: { plainText: string };
      recipients: { to: { address: string }[] };
    };
    expect(payload.headers["List-Unsubscribe"]).toBe(`<${UNSUB}>`);
    expect(payload.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(payload.content.plainText).toContain(UNSUB);
    expect(payload.recipients.to[0].address).toBe("toine@example.nl");
  });
});
