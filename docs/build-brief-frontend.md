# Build brief — APKwekker frontend

Build the frontend in `/home/toine/projects/apkwekker/frontend/` — static Vite + TypeScript multi-page site, vanilla TS, no framework. Work only inside that directory. Do not commit to git and do not deploy.

Product: Dutch consumer site. User enters kenteken → sees "voertuigpaspoort" → enters email for free APK reminders (60/30/7 days before expiry). All copy in Dutch, informal "je". Free service.

## Pages (Vite MPA rollup inputs)

1. `index.html` — hero ("APKwekker", tagline "Nooit meer je APK vergeten", subline); big Dutch license-plate styled kenteken input (yellow plate look, blue EU band with NL, auto-uppercase, strips dashes); button "Check kenteken" → GET `${API_BASE}/api/vehicle/{kenteken}` → passport card: merk, handelsbenaming, bouwjaar, brandstof, APK-vervaldatum + status badge (verlopen=red, binnenkort=orange, geldig=green), "nog X dagen", catalogusprijs (nl-NL € format), trekgewicht geremd/ongeremd; below: subscribe form (email + prefilled kenteken) → POST `${API_BASE}/api/subscribe` {kenteken,email}, display returned Dutch `{message}` or `{error}` for 400/404/429; FAQ (4 items: wat is het, is het gratis, privacy, wanneer krijg ik een herinnering); footer with privacy link, affiliate disclosure, "Voertuigdata: RDW Open Data", © 2026.
2. `privacy.html` — Dutch GDPR policy: stores only e-mail + kenteken + consent timestamp, double opt-in, unsubscribe in every mail, no data sale, affiliate disclosure ("wij ontvangen mogelijk een vergoeding voor sommige links").
3. `bevestigd.html` — "Je aanmelding is bevestigd ✓".
4. `afgemeld.html` — "Je bent afgemeld".
5. `ongeldig.html` — "Deze link is ongeldig of verlopen".

## Config

- `src/config.ts` reads `import.meta.env.VITE_API_BASE` fallback `''`.
- `public/staticwebapp.config.json`: navigationFallback excluding `/api/*`, security headers (X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, X-Frame-Options DENY, CSP self + connect-src https:).
- SEO: Dutch meta title/description + OG tags per page, robots.txt, sitemap.xml (placeholder `https://apkwekker.nl`, comment to update after real domain known).

## Design bar (avoid generic AI look)

- Dutch license-plate yellow (#F5B301-range) accent on deep ink (#1a1a2e-range) text over warm off-white background.
- One heading font (Archivo or Space Grotesk via Google Fonts), system body font.
- The kenteken input must genuinely look like a Dutch license plate — the signature UI element.
- Mobile-first, accessible: labels, focus states, aria-live on result card, AA contrast.
- Vanilla CSS in `src/style.css` with custom properties.
- XSS: never inject API data via innerHTML unescaped — use textContent or an escape helper.

## Tests

vitest + happy-dom; extract pure functions into `src/lib/` (kenteken normalize/format, passport data mapping, error-message mapping) and unit test them; ≥10 meaningful tests. `npm test` green AND `npm run build` (all 5 pages) clean — iterate until both pass.

## Report (brief)

Files, test count/status, build status, deviations, env var CI must set (VITE_API_BASE).
