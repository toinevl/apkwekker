import { VehiclePassport } from "./rdw";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="nl"><body style="font-family:Arial,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:22px">${escapeHtml(title)}</h1>
${bodyHtml}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:12px;color:#666">Je ontvangt deze e-mail omdat dit adres is aangemeld bij APKwekker. Voertuigdata: RDW Open Data.</p>
</body></html>`;
}

export function confirmationEmail(kenteken: string, confirmUrl: string): { subject: string; html: string; plainText: string } {
  const subject = `Bevestig je APK-herinnering voor ${kenteken}`;
  const html = layout(subject, `
<p>Hoi!</p>
<p>Je hebt je aangemeld voor gratis APK-herinneringen voor kenteken <strong>${escapeHtml(kenteken)}</strong>.</p>
<p>Klik op de knop om je aanmelding te bevestigen:</p>
<p><a href="${escapeHtml(confirmUrl)}" style="background:#F5B301;color:#1a1a2e;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block">Bevestig aanmelding</a></p>
<p>Heb jij je niet aangemeld? Dan kun je deze e-mail negeren; je ontvangt verder niets.</p>`);
  const plainText = `Bevestig je APK-herinnering voor ${kenteken}.\n\nOpen deze link om te bevestigen: ${confirmUrl}\n\nHeb jij je niet aangemeld? Negeer deze e-mail.`;
  return { subject, html, plainText };
}

export function reminderEmail(
  passport: Pick<VehiclePassport, "kenteken" | "merk" | "handelsbenaming" | "vervaldatum_apk">,
  days: number,
  unsubscribeUrl: string
): { subject: string; html: string; plainText: string } {
  const car = [passport.merk, passport.handelsbenaming].filter(Boolean).join(" ") || "je voertuig";
  const expired = days < 0;
  const subject = expired
    ? `Je APK is verlopen! (${passport.kenteken})`
    : `Je APK verloopt over ${days} dagen (${passport.kenteken})`;
  const html = layout(subject, `
<p>Hoi!</p>
<p>${
    expired
      ? `De APK van <strong>${escapeHtml(car)}</strong> (${escapeHtml(passport.kenteken)}) is <strong>verlopen</strong> op ${escapeHtml(passport.vervaldatum_apk ?? "onbekende datum")}. Rijden zonder geldige APK kan een boete opleveren en je verzekering kan weigeren uit te keren.`
      : `De APK van <strong>${escapeHtml(car)}</strong> (${escapeHtml(passport.kenteken)}) verloopt over <strong>${days} dagen</strong>, op ${escapeHtml(passport.vervaldatum_apk ?? "onbekende datum")}.`
  }</p>
<p>Plan op tijd een keuring bij je garage. Tip: laat je auto ruim voor de vervaldatum keuren — je houdt dan gewoon je oude vervaldatum.</p>
<p style="font-size:12px;color:#666"><a href="${escapeHtml(unsubscribeUrl)}">Afmelden voor deze herinneringen</a></p>`);
  const plainText = `${subject}\n\nPlan op tijd een APK-keuring bij je garage.\n\nAfmelden: ${unsubscribeUrl}`;
  return { subject, html, plainText };
}
