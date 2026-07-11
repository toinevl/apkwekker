# Business Plan — APKwekker

*Date: 2026-07-11 · Author: Claude (autonomous build for Toine) · Status: selected concept*

## Goal

A web app generating a **modest monthly income** (target: €100–€500/month within 12 months) with near-zero running costs, hosted on Azure, buildable and maintainable by one person.

## Opportunity research — 3 alternatives

Research was done via SearXNG web search (micro-SaaS trend articles, Indie Hackers / HN side-project income threads, Dutch market gap analysis) plus direct validation of the underlying data source (RDW open data API).

### Alternative 1 — APKwekker (Dutch APK reminder + vehicle insight)

**What:** Free service: enter your kenteken + email, get a reminder before your APK (Dutch MOT) expires. Instantly also shows a vehicle passport (make, model, build year, APK date, catalog price, fuel type, towing capacity) from RDW open data.

**Target audience:** ~8.9M Dutch passenger-car owners; specifically private owners of cars 4+ years old (APK-plichtig) who don't have a garage subscription reminder. RDW sends letters, but late and paper-based; garages only remind their own customers.

**Revenue model (layered):**
1. **Affiliate:** autoverzekering vergelijken (Independer/Zorgwijzer-style programs pay €15–€40 per lead), occasion-check services, trekhaak/onderhoud shops. Placed contextually in the vehicle passport and in reminder emails.
2. **Display ads** (once traffic >5k visits/month): EU-consent-based ads.
3. **Premium tier (later):** multi-vehicle fleet reminders for ZZP'ers/small businesses (€1/vehicle/month).

**Costs:** RDW data is free and open (no API key). Azure SWA Free + Functions Flex Consumption + Table Storage + ACS Email ≈ €5–€15/month. No LLM costs in the core loop.

**Why it can win:** recurring engagement by design (a reminder brings the user back every year, and email addresses compound into an owned marketing channel), evergreen search demand ("apk verlopen", "apk check kenteken"), and Toine already has proven kenteken-domain expertise (kentekenmagic) plus the exact Azure stack (nordicHolidays/goGo).

**Risks:** competitors exist (kentekencheck.nl shows APK dates; some garages offer reminders). Differentiator: the *reminder* as the product, not the lookup; nobody owns "APK-wekker" mindshare. Email deliverability must be managed (SPF/DKIM via ACS).

### Alternative 2 — TrekCheck (towing-weight check by kenteken)

**What:** Enter kenteken (car) + caravan/trailer weight → instant legal check (geremd/ongeremd max, rijbewijs BE requirement, kombinatiegewicht). RDW provides all towing fields.

**Target audience:** Dutch caravan owners (~450k caravans), trailer renters, boat owners.

**Revenue:** affiliate (caravan insurance, trekhaak shops, ANWB-style products), display ads. Strongly seasonal (peaks April–July).

**Risks:** very seasonal, smaller search volume, single-feature site is easy to clone, and the ANWB already offers a caravan-gewicht check. Lower ceiling than Alternative 1 — but a natural **feature** inside Alternative 1's vehicle passport.

### Alternative 3 — SollicitatieMaatje AI (Dutch AI cover-letter generator)

**What:** Paste a vacancy URL + your CV highlights → tailored Dutch sollicitatiebrief. Freemium: 1 free letter, credits for more (€4.95 for 5).

**Target audience:** Dutch job seekers (~500k actively searching at any time).

**Revenue:** direct payments (highest per-user revenue of the three).

**Risks:** crowded market (CareerToolbelt, jobcopilot, free ChatGPT/Word built-ins), per-use LLM costs mean losses on free users, payment integration (Mollie/Stripe) adds compliance overhead, and content quality moderation is ongoing work. Highest revenue ceiling but highest cost, highest competition, and no recurring engagement (people stop job-hunting).

## Scoring & selection

| Criterion (weight) | APKwekker | TrekCheck | SollicitatieMaatje |
|---|---|---|---|
| Market size / search demand (25%) | 5 | 3 | 4 |
| Competition gap (20%) | 4 | 3 | 2 |
| Recurring engagement / owned channel (20%) | 5 | 2 | 1 |
| Running cost & simplicity (20%) | 5 | 5 | 2 |
| Fit with existing expertise & stack (15%) | 5 | 5 | 3 |
| **Weighted total** | **4.8** | **3.5** | **2.4** |

**Selected: APKwekker** — with TrekCheck's towing check absorbed as a vehicle-passport feature (near-free to add since the RDW fields are already fetched).

## Financial projection (conservative)

| Month | Visits/mo | Subscribers | Revenue/mo | Costs/mo |
|---|---|---|---|---|
| 3 | 500 | 150 | €0–€20 | €10 |
| 6 | 2,500 | 900 | €50–€120 (affiliate) | €12 |
| 12 | 8,000 | 3,500 | €150–€450 (affiliate + ads) | €15 |

Break-even expected around month 4–5. The email list is the compounding asset: every yearly APK reminder email is a high-intent moment (car is 1 year older → insurance switch, maintenance, replacement purchase).

## Legal / compliance notes

- GDPR: store only email + kenteken + consent timestamp; double opt-in; one-click unsubscribe; privacy policy page. Kenteken alone is not directly identifying, but treat the pair as personal data.
- RDW open data licence: free to reuse, attribution appreciated.
- Affiliate disclosure on site and in emails (Dutch: "wij ontvangen mogelijk een vergoeding").
