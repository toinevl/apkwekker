# Launchposts — week 1–2

Ready-to-paste. Toon, don't sell: we vragen feedback, we verkopen niks. Alle posts vermelden eerlijk dat het een eigen project is (dat verwachten Reddit én Tweakers). Vervang links niet — het product ís de link.

## Reddit — r/thenetherlands

**Titel:**
> Ik vergat altijd mijn APK-vervaldatum, dus ik heb er een gratis e-mail-wekker voor gebouwd. Feedback welkom.

**Bericht:**
> Twee jaar geleden mijn APK vergeten. Geen boete gekregen, maar wél een vervelende telefoon met de verzekeraar toen er schade was. Sindsdien vergeet ik het nooit meer — maar ik realiseerde me dat ik dat niet opgelost had met discipline, maar met puur geluk.
>
> Dus heb ik er iets voor gebouwd: **[APKwekker](https://apkwekker.com/)**. Je typt je kenteken, vult je e-mail in, en je krijgt 60, 30 en 7 dagen vóór de vervaldatum een mailtje. Geen account, geen app, geen kosten.
>
> Nee, geen schattige subscription-plans. Het is gratis en de site draait op affiliatievergoedingen (waarvan ik niet eens weet of die ooit iets opleveren — iets met verzekeringsvergelijkers). Data komt uit het openbare RDW-kentekenregister.
>
> Wat ik graag wil weten van jullie:
> - Zou je dit gebruiken, of check je gewoon jaarlijks zelf even?
> - Vertrouw je je e-mailadres hieraan, en zo nee — waarom niet? (privacy-pagina staat online)
> - Wat mist er?
>
> Eerlijk is eerlijk: ik ben de enige bouwer, het is bij nader inzien meer werk dan ik dacht, en de eerste week kreeg ik 47 meldingen van mijzelf dat het attekenen van een Spark-schema lastiger is dan de RDW-API schrijven.

*(Opmerking: laatste alinea naar eigen smaak aanpassen of schrappen. Post bij voorkeur op een doordeweekse ochtend ~09:00; beantwoord alle reacties binnen een uur.)*

## Reddit — r/autos (NL-thread / show-thread)

**Titel:**
> Gratis APK-herinnering per e-mail gebouwd (NL) — wat zou jullie tegenhouden om dit te gebruiken?

**Bericht:**
> Kort verhaal: auto's verliezen hun APK-datum nooit uit het RDW-register, maar mensen verliezen wél het overzicht. [APKwekker](https://apkwekker.com/) mailt je 60/30/7 dagen vóór de vervaldatum. Gratis, geen account, dubbele opt-in, afmelden met één klik.
>
> Ik zit vooral met één vraag: de concurrentie (kentekenchecksites) toont de datum netjes — en toch rijden er ruim 238.000 auto's rond met een verlopen APK. Het probleem is dus niet de informatie, maar het vergeten. Klopt die analyse? Wat zou er in de herinnering moeten staan om écht actie uit te lokken?

## Tweakers — forum (W&T → "Sites voor eigen werk"-regels respecteren)

**Titel:**
> [Site] apkwekker.com — gratis APK-herinnering per e-mail (eigen werk, feedback gevraagd)

**Bericht:**
> Beste Tweakers,
>
> Na wat avonduren staat er eindelijk iets online dat ik zelf nodig had: **[apkwekker.com](https://apkwekker.com/)** — een gratis herinneringsservice voor je APK-vervaldatum.
>
> **Werking:**
> - Kenteken invoeren → vervaldatum, merk en bouwjaar direct uit de RDW Open Data
> - E-mailadres invullen → herinneringen op 60, 30 en 7 dagen vóór de vervaldatum
> - Dubbele opt-in, afmelden met één klik, geen account
>
> **Technisch:** statische frontend (Azure Static Web Apps), API met RDW Open Data als bron. Bewust geen framework-ballast; Lighthouse-score staat boven de 95.
>
> **Verdienmodel:** het blijft gratis; draaiend houden via affiliatie (vergelijkers), zoals eerlijk in de FAQ en voettekst vermeld.
>
> **Feedback waar ik vooral op zit te wachten:**
> 1. De e-mails: inhoudelijk sterk genoeg, of te mager?
> 2. Zou je het zelf gebruiken naast de RDW-site?
> 3. Spelfouten, randgevallen (RVO-kentekens, importauto's), rare states in de UI — schiet maar.
>
> Bij voorbaat dank. Ik kom op elke reactie terug.

## Facebookgroepen (lokale vraag & aanbod / auto-groepen)

*(Kort houden — groepen zijn geen blog. Eén variant, posten als reactie op "hoe laat ik APK keuren"-vragen én als eigen post.)*

> Tip voor wie het ook altijd vergeet 😄: apkwekker.com — je vult je kenteken + e-mail in en krijgt gratis een mailtje voordat je APK verloopt (60, 30 en 7 dagen van tevoren). Geen account nodig. Nee, ik ben geen garage — ik ben gewoon iemand die er ooit 190 euro aan boetes aan heeft moeten geloven... ook niet, maar je snapt de motivatie. 🚗⏰

*(Let op: check de groepsregels; veel groepen staan eigen promotie alleen op specifieke dagen toe.)*

## Marktplaats-community / forumreactie

> Handig voor wie 't ook altijd vergeet: **apkwekker.com** — gratis herinnering per e-mail voordat je APK verloopt (60/30/7 dagen). Alleen je kenteken en e-mailadres nodig, geen account. Data komt van de RDW. Ik heb 'm zelf gebouwd, dus feedback is ook welkom.

## WhatsApp-deeltekst

**Kort (sturen naar familie/vrienden):**
> Ken je dat, dat je nooit weet wanneer je APK verloopt? Zet 'm hier neer: apkwekker.com — gratis mailtje voordat hij afloopt. Kenteken + e-mail en je bent klaar ⏰🚗

**Droog (groepsapp):**
> Voor de groep: https://apkwekker.com — de wekker voor je APK. Gratis. Ja, ook voor jouw diesel.

**Antwoord op "hoeveel boete APK verlopen?":**
> €190 boete + mogelijke gedoe met je verzekering. Voortaan: apkwekker.com — gratis herinnering per mail, 30 seconden werk. 😉
