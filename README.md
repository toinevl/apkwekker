# APKwekker

**Nooit meer je APK vergeten.** Vul je kenteken en e-mailadres in en ontvang op tijd een gratis herinnering vóórdat je APK verloopt — plus direct een compleet voertuigpaspoort (merk, model, bouwjaar, brandstof, cataloguswaarde, trekgewicht) uit open RDW-data.

**Live:** https://victorious-pebble-0f3357803.7.azurestaticapps.net

## Architecture

- **Frontend:** static site (Vite + TypeScript), hosted on Azure Static Web Apps (Free tier)
- **API:** Azure Functions v4 (Node 20, TypeScript) on Flex Consumption, called cross-origin (app-level CORS)
- **Data:** Azure Table Storage (subscriptions), RDW Open Data API (vehicle data, no key required)
- **Email:** Azure Communication Services (double opt-in confirmation + APK reminders at T-60/T-30/T-7)
- **Infra:** Bicep in `infra/`, resource group `rg-apkwekker` (dedicated, no shared resources)

```
frontend/   Vite + TS static frontend (NL)
api/        Azure Functions v4 API + daily reminder timer
e2e/        Isolated Playwright E2E suite against production
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
cd api && env -u NODE_ENV npm ci && npm test      # API unit tests (29)
cd frontend && npm ci && npm test                   # Frontend unit tests (11)
cd e2e && npm ci && API_BASE_URL=https://func-apkwekker.azurewebsites.net npx playwright test
```

## Deployment

GitHub Actions:
- `deploy-frontend.yml` — SWA
- `deploy-api.yml` — Functions Flex Consumption via Azure login + `az functionapp deploy`
- `e2e.yml` — Playwright E2E against production on push to `main`

All workflows support `workflow_dispatch`.

**Required GitHub secrets:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN` — SWA deployment token
- `AZURE_CREDENTIALS` — Azure service principal JSON (Contributor on rg-apkwekker)

**Required GitHub vars:**
- `API_BASE_URL` — Function App base URL for frontend build and E2E

## Production verification

- API tests: `29 passed (29)`
- Frontend unit tests: `11 passed`
- Frontend build: passing
- E2E: Playwright workflow present; latest live-run fixes verified ad-hoc; awaiting CI confirmation of green run from workflow `29282621701`

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
