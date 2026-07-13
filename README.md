# APKwekker

**Nooit meer je APK vergeten.** Vul je kenteken en e-mailadres in en ontvang op tijd een gratis herinnering vóórdat je APK verloopt — plus direct een compleet voertuigpaspoort (merk, model, bouwjaar, brandstof, cataloguswaarde, trekgewicht) uit open RDW-data.

**Live:** https://victorious-pebble-0f3357803.7.azurestaticapps.net

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

## Live endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/vehicle/{kenteken}` | Vehicle passport from RDW |
| `POST /api/subscribe` | Subscribe (double opt-in) |
| `GET /api/confirm?token=` | Confirm subscription |
| `GET /api/unsubscribe?token=` | One-click unsubscribe |
| Timer `sendReminders` | Daily 07:00 UTC, sends T-60/T-30/T-7 reminders |

## Development

```bash
cd api && npm install && npm test      # API unit tests (29)
cd frontend && npm install && npm run dev   # Frontend dev server + tests (11)
```

## Deployment

GitHub Actions: `deploy-frontend.yml` (SWA) and `deploy-api.yml` (Functions Flex Consumption via Azure login + `az functionapp deploy`). Both support `workflow_dispatch`.

**Required GitHub secrets:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN` — SWA deployment token
- `AZURE_CREDENTIALS` — Azure service principal JSON (Contributor on rg-apkwekker)

**Required GitHub vars:**
- `API_BASE_URL` — Function App base URL for frontend build

## Azure resources (rg-apkwekker)

| Resource | Name | Tier |
|---|---|---|
| Resource Group | rg-apkwekker | — |
| Static Web App | swa-apkwekker | Free |
| Function App | func-apkwekker | Flex Consumption (FC1) |
| Storage Account | stapkwekkerhg76gbqfrdhiq | Standard LRS |
| Communication Services | acs-apkwekker | — |
| Email Service | email-apkwekker | Azure Managed Domain |
| Log Analytics | log-apkwekker | PerGB2018 |
| App Insights | appi-apkwekker | — |

## Privacy

Double opt-in, one-click unsubscribe, only e-mail + kenteken + consent timestamp stored. See `/privacy.html` on the site.

Voertuigdata: [RDW Open Data](https://opendata.rdw.nl).
