# APKwekker — wishlist / build tracker

Convention: todo.txt-style. `x` = done, `(A)`–`(D)` = priority, `+tag`, `#id`.
This file is the single source of truth for build progress and the future backlog.
Rule (lesson from workforceplanning): an item is only `x` when the work is committed and verified, not when claimed.

## Phase 0 — Research & planning
x 2026-07-11 (A) Research 3 opportunities via web search, score, select APKwekker +research #001
x 2026-07-11 (A) Validate RDW open data API (APK date, towing fields, no key needed) +research #002
x 2026-07-11 (A) Write business plan docs/business-plan.md +docs #003

## Phase 1 — Scaffold
x 2026-07-11 (A) Project structure (frontend/, api/, infra/, docs/) + first commit +scaffold #010
x 2026-07-11 (A) Create GitHub repo toinevl/apkwekker (name verified unique, 0 search hits) +scaffold #011
x 2026-07-11 (B) CI workflows with workflow_dispatch (lesson: azure-deployment-lessons) +ci #012

## Phase 2 — Build (TDD, subagents)
x 2026-07-11 (A) API: GET /api/vehicle/{kenteken} — RDW lookup + vehicle passport + towing check +api #020
x 2026-07-11 (A) API: POST /api/subscribe — kenteken+email, double opt-in token, Table Storage +api #021
x 2026-07-11 (A) API: GET /api/confirm?token= — confirm subscription (double opt-in, GDPR) +api #022
x 2026-07-11 (A) API: GET /api/unsubscribe?token= — one-click unsubscribe +api #023
x 2026-07-11 (A) Timer function: daily scan, send reminder emails at T-60/T-30/T-7 days +api #024
x 2026-07-11 (A) Email sending via Azure Communication Services (dev-mode fallback logs) +api #025
x 2026-07-11 (A) Frontend: landing page — kenteken input, vehicle passport, subscribe form (NL) +frontend #026
x 2026-07-11 (B) Frontend: privacy policy + affiliate disclosure pages (NL, GDPR) +frontend #027
x 2026-07-11 (B) Rate limiting on subscribe (5/IP/uur, in-memory) +security #028
x 2026-07-11 (B) Input validation: kenteken normalization, zod strict schemas, Dutch error messages +security #029
x 2026-07-11 (B) Tests green: API 29/29, frontend 11/11, builds clean (verified 2026-07-11) +quality #030

## Phase 3 — Deploy (new RG, no shared resources)
x 2026-07-13 (A) Provision rg-apkwekker (SWA Free + Flex Consumption + Storage + ACS Email) via Bicep +infra #040
x 2026-07-13 (A) App-level CORS via ALLOWED_ORIGINS env (code-level, not platform CORS — Flex Consumption has no platform CORS) +infra #041
x 2026-07-13 (A) Flex Consumption deploy via az functionapp deploy + blob container (not publish-profile — Flex Consumption doesn't support it) +infra #042
x 2026-07-13 (A) Deploy frontend via SWA CLI + API via az functionapp deploy +deploy #043
x 2026-07-13 (A) E2E verify: happy path AND error path (bad kenteken → 404, bad email → 400) +verify #044
x 2026-07-13 (A) Verify subscribe → confirm flow → row in Table Storage + ACS email delivery confirmed +verify #045

## Phase 4 — Marketing & docs
(A) Marketing plan docs/marketing-plan.md (SEO, content calendar, launch channels) +marketing #050
(B) SEO basics: meta tags, sitemap.xml, robots.txt, OG image +marketing #051
(A) GitHub wiki: Home, Architecture, Deployment, Business Plan, Marketing, Artifact Log +docs #052

## Backlog (post-launch, future reference)
(B) Affiliate integration: insurance comparison deep links in vehicle passport +revenue #060
(B) Custom domain apkwekker.nl or apk.van-vliet.eu + SPF/DKIM for email deliverability +infra #061
(B) Consent-based display ads once >5k visits/month +revenue #062
(C) Premium fleet tier for ZZP: multi-vehicle dashboard, €1/vehicle/month +revenue #063
(C) TrekCheck feature page: caravan weight legal check as SEO landing page +feature #064
(C) Reminder channel: optional WhatsApp/SMS via ACS +feature #065
(C) Programmatic SEO: per-model landing pages ("APK check Volkswagen Golf") +marketing #066
(D) Analytics: privacy-friendly (Plausible-style) counters +ops #067
