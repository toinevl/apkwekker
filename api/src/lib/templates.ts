import { VehiclePassport } from "./rdw";

const SITE_URL = "https://apkwekker.com";
// CJIB-tarief personenauto 2026 — boetetarieven worden jaarlijks geïndexeerd:
// bij publicatie van het tarief 2027 dit bedrag opnieuw verifiëren.
const BOETE_EURO = 190;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * List-Unsubscribe headers (RFC 2369 + RFC 8058 one-click).
 * Vereist door Google/Yahoo voor bulk-afzenders: elke notificatiemail moet een
 * uitschrijfoptie in de header hebben.
 */
export function listUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="nl"><body style="font-family:Arial,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:12px;color:#666;margin:0 0 8px">Je ontvangt deze e-mail omdat dit adres is aangemeld bij APKwekker. Voertuigdata: RDW Open Data.</p>
<p style="font-size:12px;color:#666;margin:0">Ken je iemand die altijd te laat is met z'n APK? Stuur deze mail door: <a href="${SITE_URL}/">${SITE_URL}</a> 😉</p>
</body></html>`;
}

const CTA_STYLE =
  "background:#F5B301;color:#1a1a2e;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block";

export function confirmationEmail(
  kenteken: string,
  confirmUrl: string,
  unsubscribeUrl: string
): { subject: string; html: string; plainText: string; headers: Record<string, string> } {
  const subject = `Eén klik en je APK-vervaldatum is geregeld (${kenteken})`;
  const html = layout(subject, `
<p style="margin:0 0 12px">Hoi!</p>
<p style="margin:0 0 12px">Je hebt je aangemeld voor gratis APK-herinneringen voor <strong>${escapeHtml(kenteken)}</strong>. Na bevestiging krijg je automatisch bericht op <strong>60, 30 en 7 dagen</strong> vóór de vervaldatum.</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(confirmUrl)}" style="${CTA_STYLE}">Bevestig aanmelding</a></p>
<p style="font-size:12px;color:#666;margin:0 0 12px">Tussendoor even benieuwd naar je vervaldatum? Die staat <a href="${SITE_URL}/">hier</a>.</p>
<p style="margin:0">Heb jij je niet aangemeld? Negeer deze e-mail; je ontvangt dan verder niets.</p>`);
  const plainText = `Bevestig je APK-herinnering voor ${kenteken}.

Na bevestiging ontvang je 60, 30 en 7 dagen voordat je APK verloopt een herinnering.

Bevestig via deze link: ${confirmUrl}

Heb jij je niet aangemeld? Negeer deze e-mail.

Afmelden: ${unsubscribeUrl}`;
  return { subject, html, plainText, headers: listUnsubscribeHeaders(unsubscribeUrl) };
}

export function reminderEmail(
  passport: Pick<VehiclePassport, "kenteken" | "merk" | "handelsbenaming" | "vervaldatum_apk">,
  days: number,
  unsubscribeUrl: string
): { subject: string; html: string; plainText: string; headers: Record<string, string> } {
  const car = [passport.merk, passport.handelsbenaming].filter(Boolean).join(" ") || "je voertuig";
  const expired = days < 0;
  const vervaldatum = passport.vervaldatum_apk ?? "onbekende datum";

  const subject = expired
    ? `🚨 De APK van ${car} is verlopen (${passport.kenteken})`
    : days <= 7
      ? `⏰ Nog ${days} dagen: de APK van ${car} verloopt (${passport.kenteken})`
      : `⏰ Over ${days} dagen verloopt de APK van ${car}`;

  const html = layout(
    subject,
    expired
      ? `
<p style="margin:0 0 12px">Hoi!</p>
<p style="margin:0 0 12px">De APK van <strong>${escapeHtml(car)}</strong> (${escapeHtml(passport.kenteken)}) is verlopen per ${escapeHtml(vervaldatum)}. Rijden zonder geldige APK kan een boete van €${BOETE_EURO} opleveren — en je verzekeraar kan bij schade terugvorderen.</p>
<p style="margin:0 0 12px"><strong>Het goede nieuws:</strong> met een keuringsafspraak mag je nog rechtstreeks naar de garage rijden.</p>
<p style="margin:0 0 12px"><a href="${SITE_URL}/" style="${CTA_STYLE}">Plan nu je keuring</a></p>
<p style="font-size:12px;color:#666;margin:0 0 12px">Bellen met de garage duurt 2 minuten en lost alles op.</p>
<p style="font-size:12px;color:#666;margin:0"><a href="${escapeHtml(unsubscribeUrl)}">Afmelden voor deze herinneringen</a></p>`
      : `
<p style="margin:0 0 12px">Hoi!</p>
<p style="margin:0 0 12px">De APK van <strong>${escapeHtml(car)}</strong> (${escapeHtml(passport.kenteken)}) verloopt over <strong>${days} dagen</strong>, op ${escapeHtml(vervaldatum)}.</p>
<p style="margin:0 0 12px"><strong>Handig om te weten:</strong> laat je binnen 2 maanden vóór die datum keuren en je komt erdoorheen, dan schuift je vervaldatum gewoon een jaar op. Je verliest dus niks door op tijd te gaan.</p>
<p style="margin:0 0 12px"><a href="${SITE_URL}/" style="${CTA_STYLE}">Vervaldatum nog even checken</a></p>
<p style="font-size:12px;color:#666;margin:0 0 12px">We herinneren je ook bij 30 en 7 dagen.</p>
<p style="font-size:12px;color:#666;margin:0"><a href="${escapeHtml(unsubscribeUrl)}">Afmelden voor deze herinneringen</a></p>`
  );

  const plainText = expired
    ? `De APK van ${car} (${passport.kenteken}) is verlopen per ${vervaldatum}.

Rijden zonder geldige APK kan een boete van €${BOETE_EURO} opleveren — en je verzekeraar kan bij schade terugvorderen. Met een keuringsafspraak mag je nog rechtstreeks naar de garage rijden.

Plan je keuring: ${SITE_URL}/
Afmelden: ${unsubscribeUrl}`
    : `De APK van ${car} (${passport.kenteken}) verloopt over ${days} dagen, op ${vervaldatum}.

Tip: laat je binnen 2 maanden voor die datum keuren en je komt erdoorheen, dan schuift je vervaldatum gewoon een jaar op. Je verliest dus niks door op tijd te gaan.

Check je vervaldatum: ${SITE_URL}/
Afmelden: ${unsubscribeUrl}`;

  return { subject, html, plainText, headers: listUnsubscribeHeaders(unsubscribeUrl) };
}
