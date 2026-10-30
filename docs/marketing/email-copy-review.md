# E-mailcopy-review — `api/src/lib/templates.ts`

Review van de bestaande templates (gelezen op 30-10-2026), daarna verbeterde versies die direct in `templates.ts` te plakken zijn. Tone of voice: 'je', kort, praktisch, droge knipoog.

## Wat er al goed is

- **Dubbele opt-in expliciet + "negeer deze mail"** — precies goed voor leverbaarheid en wetgeving.
- **De 2-maanden-tip staat al in de reminder** ("je houdt dan gewoon je oude vervaldatum") — dat is de beste regel van het hele bestand; die verdient prominentie.
- **Afmeldlink aanwezig** in beide mails.

## Wat beter kan

1. **Subject van de reminder is admin-taal.** "Je APK verloopt over 60 dagen (XX-99-XX)" is een systeembericht. Een deadline-mail mag urgentie tonen: "⏰ Over 60 dagen verloopt je APK". Het kenteken kan naar de preview-tekst/bovenaan het bericht.
2. **De reminder-HTML bevat het auto-merk, maar de plainText-versie niet.** Iedereen zonder HTML-mail (of in donkere-tekstweergave) krijgt een kale "Plan op tijd een APK-keuring bij je garage." zonder kenteken of datum. Fataal voor vertrouwen — de ontvanger weet dan niet eens wélke auto het gaat. **Dit is de grootste bug in de copy.**
3. **Geen CTA-knop in de reminder.** De bevestigingsmail heeft een knop, de reminder niet. Minimaal een link "Vervaldatum nog even checken" naar de site.
4. **Geen viral loop.** Het marketingplan noemt de voettekst "Doorsturen naar iemand die altijd te laat is met z'n APK 😉" — ontbreekt in `layout()`.
5. **Expired-variant verwart "boete" en "verzekering".** Formulering "je verzekering kan weigeren uit te keren" is juridisch te stellig (WA schadevergoeding aan slachtoffers keert doorgaans wél uit; verzekeraars kunnen regres nemen). Ader: "een boete van €190 — en je verzekeraar kan bij schade terugvorderen."
6. **Expired-variant mist de belangrijkste geruststelling:** met een keuringsafspraak mag je nog rechtstreeks naar de garage rijden. Voor de ontvanger van díe mail is dat het verschil tussen paniek en een oplossing.
7. **Bevestigingsmail verkoopt het product niet.** Het beste moment om te vertellen *wat* ze krijgen (60/30/7) is direct na aanmelding — nu ontdekt de gebruiker dat pas bij mail 1.
8. **Kleine dingen:** "Hoi!" is prima; subjects met ⏰/🚗 kunnen in sommige clients spammig ogen — max 1 emoji per subject; `layout()` heeft geen `<p style="margin:...">`-reset, wat in Outlook ongelijke marges geeft (cosmetisch).

## Verbeterde templates (ready-to-code)

```ts
// layout: viral-loop-voettekst toevoegen
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="nl"><body style="font-family:Arial,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:22px">${escapeHtml(title)}</h1>
${bodyHtml}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:12px;color:#666">Je ontvangt deze e-mail omdat dit adres is aangemeld bij APKwekker. Voertuigdata: RDW Open Data.</p>
<p style="font-size:12px;color:#666">Ken je iemand die altijd te laat is met z'n APK? Stuur 'm door: <a href="https://apkwekker.nl/">apkwekker.nl</a> 😉</p>
</body></html>`;
}
```

```ts
export function confirmationEmail(kenteken: string, confirmUrl: string): { subject: string; html: string; plainText: string } {
  const subject = `Eén klik en je APK-vervaldatum is geregeld (${kenteken})`;
  const html = layout(subject, `
<p>Hoi!</p>
<p>Je hebt je aangemeld voor gratis APK-herinneringen voor <strong>${escapeHtml(kenteken)}</strong>. Bevestig je aanmelding en je krijgt automatisch bericht op <strong>60, 30 en 7 dagen</strong> vóór de vervaldatum.</p>
<p><a href="${escapeHtml(confirmUrl)}" style="background:#F5B301;color:#1a1a2e;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block">Bevestig aanmelding</a></p>
<p style="font-size:12px;color:#666">Tussendoor even benieuwd naar je vervaldatum? Die staat <a href="https://apkwekker.nl/">hier</a>.</p>
<p>Heb jij je niet aangemeld? Negeer deze e-mail; je ontvangt dan verder niets.</p>`);
  const plainText = `Bevestig je APK-herinnering voor ${kenteken}.\n\nNa bevestiging ontvang je 60, 30 en 7 dagen voordat je APK verloopt een herinnering.\n\nBevestig via deze link: ${confirmUrl}\n\nHeb jij je niet aangemeld? Negeer deze e-mail.`;
  return { subject, html, plainText };
}
```

```ts
export function reminderEmail(
  passport: Pick<VehiclePassport, "kenteken" | "merk" | "handelsbenaming" | "vervaldatum_apk">,
  days: number,
  unsubscribeUrl: string
): { subject: string; html: string; plainText: string } {
  const car = [passport.merk, passport.handelsbenaming].filter(Boolean).join(" ") || "je voertuig";
  const expired = days < 0;

  const subject = expired
    ? `🚨 De APK van ${car} is verlopen (${passport.kenteken})`
    : days <= 7
      ? `⏰ Nog ${days} dagen: de APK van ${car} verloopt (${passport.kenteken})`
      : `⏰ Over ${days} dagen verloopt de APK van ${car}`;

  const html = layout(subject, expired ? `
<p>Hoi!</p>
<p>De APK van <strong>${escapeHtml(car)}</strong> (${escapeHtml(passport.kenteken)}) is verlopen per ${escapeHtml(passport.vervaldatum_apk ?? "onbekende datum")}. Rijden zonder geldige APK kan een boete van €190 opleveren — en je verzekeraar kan bij schade terugvorderen.</p>
<p><strong>Het goede nieuws:</strong> met een keuringsafspraak mag je nog rechtstreeks naar de garage rijden.</p>
<p><a href="https://apkwekker.nl/" style="background:#F5B301;color:#1a1a2e;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block">Plan nu je keuring</a></p>
<p style="font-size:12px;color:#666">Bellen met de garage duurt 2 minuten en lost alles op.</p>
<p style="font-size:12px;color:#666"><a href="${escapeHtml(unsubscribeUrl)}">Afmelden voor deze herinneringen</a></p>` : `
<p>Hoi!</p>
<p>De APK van <strong>${escapeHtml(car)}</strong> (${escapeHtml(passport.kenteken)}) verloopt over <strong>${days} dagen</strong>, op ${escapeHtml(passport.vervaldatum_apk ?? "onbekende datum")}.</p>
<p><strong>Handig om te weten:</strong> laat je binnen 2 maanden vóór die datum keuren en je komt erdoorheen, dan schuift je vervaldatum gewoon een jaar op. Je verliest dus niks door op tijd te gaan.</p>
<p><a href="https://apkwekker.nl/" style="background:#F5B301;color:#1a1a2e;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block">Vervaldatum nog even checken</a></p>
<p style="font-size:12px;color:#666">Deze mail komt van APKwekker — we herinneren je ook bij 30 en ${expired ? "" : "7 "}dagen.</p>
<p style="font-size:12px;color:#666"><a href="${escapeHtml(unsubscribeUrl)}">Afmelden voor deze herinneringen</a></p>`);

  const plainText = expired
    ? `De APK van ${car} (${passport.kenteken}) is verlopen per ${passport.vervaldatum_apk ?? "onbekende datum"}.\n\nRijden zonder geldige APK kan een boete van €190 opleveren. Met een keuringsafspraak mag je nog rechtstreeks naar de garage rijden — bel of boek online en regel het vandaag.\n\nAfmelden: ${unsubscribeUrl}`
    : `De APK van ${car} (${passport.kenteken}) verloopt over ${days} dagen, op ${passport.vervaldatum_apk ?? "onbekende datum"}.\n\nTip: laat je binnen 2 maanden voor die datum keuren, dan houdt je gewoon je oude vervaldatum.\n\nAfmelden: ${unsubscribeUrl}`;

  return { subject, html, plainText };
}
```

## Open puntjes voor de dev

- De `days <= 7`-vertakking: mail op dag 7 wil je scherper dan op dag 60 — hier zat nog geen onderscheid.
- "Plan nu je keuring" knop in de expired-mail linkt nu naar de homepage; als er ooit een garagelocator/affiliate-garagelink komt, wisselen.
- Boetebedrag €190 is het tarief van 2026; bij indexatie is dit de ene string die moet meebewegen (overweeg `const BOETE = 190` met commentaar op jaarlijkse check).
- Timing van de 60-daagse mail: verstuur 's ochtends vroeg op een doordeweekse dag; deadlinemails die 's avonds binnenkomen worden vaker vergeten (en vaker als spam gemarkeerd).
