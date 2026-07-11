# APKwekker

**Nooit meer je APK vergeten.** Vul je kenteken en e-mailadres in en ontvang op tijd een gratis herinnering vóórdat je APK verloopt — plus direct een compleet voertuigpaspoort (merk, model, bouwjaar, brandstof, cataloguswaarde, trekgewicht) uit open RDW-data.

## Architecture

- **Frontend:** static site (Vite + TypeScript), hosted on Azure Static Web Apps (Free tier)
- **API:** Azure Functions v4 (Node 20, TypeScript) on Flex Consumption, called cross-origin (platform CORS)
- **Data:** Azure Table Storage (subscriptions), RDW Open Data API (vehicle data, no key required)
- **Email:** Azure Communication Services (double opt-in confirmation + APK reminders at T-60/T-30/T-7)
- **Infra:** Bicep in `infra/`, resource group `rg-apkwekker` (dedicated, no shared resources)

```
frontend/   Vite + TS static frontend (NL)
api/        Azure Functions v4 API + daily reminder timer
infra/      Bicep templates
docs/       business plan, marketing plan, architecture
wishlist.md build tracker + backlog (todo.txt-style)
```

## Development

```bash
cd api && npm install && npm test      # API unit tests
cd frontend && npm install && npm run dev
```

## Deployment

GitHub Actions: `deploy-frontend.yml` (SWA) and `deploy-api.yml` (Functions). Both support `workflow_dispatch`. See the wiki for the full runbook.

## Privacy

Double opt-in, one-click unsubscribe, only e-mail + kenteken + consent timestamp stored. See `/privacy.html` on the site.

Voertuigdata: [RDW Open Data](https://opendata.rdw.nl).
