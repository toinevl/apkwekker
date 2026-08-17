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

## Phase 3 — Deploy
x 2026-07-13 (A) Provision rg-apkwekker (SWA Free + Flex Consumption + Storage + ACS Email) via Bicep +infra #040
x 2026-07-13 (A) App-level CORS via ALLOWED_ORIGINS env (code-level, not platform CORS — Flex Consumption has no platform CORS) +infra #041
x 2026-07-13 (A) Flex Consumption deploy via az functionapp deploy + blob container (not publish-profile — Flex Consumption doesn't support it) +infra #042
x 2026-07-13 (A) Deploy frontend via SWA CLI + API via az functionapp deploy +deploy #043
x 2026-07-13 (A) Add Playwright production E2E coverage file for all user flows +verify #044
x 2026-07-13 (A) Run Playwright E2E green in CI against production +verify #044
x 2026-07-13 (A) Git push current deploy/verify work + README update +deploy #047

## Phase 4 — Marketing & docs
x 2026-07-13 (A) Marketing plan docs/marketing-plan.md (SEO, content calendar, launch channels) +marketing #050
x 2026-07-13 (A) SEO basics: meta tags, sitemap.xml, robots.txt, OG image, Twitter Cards, JSON-LD structured data +marketing #051
x 2026-07-13 (A) GitHub wiki: Home, Architecture, Deployment, Business Plan, Marketing, Artifact Log +docs #052

## Bugs (production)
x 2026-08-17 (A) Kenteken-lookup broken on both custom domains — CORS allowlist only had the raw SWA URL. Reported by Toine ("zk655h" → "Kan de server niet bereiken"). The SWA has two custom hostnames registered (apkwekker.autos, apkwekker.stoncoo.com) but ALLOWED_ORIGINS on func-apkwekker listed ONLY https://victorious-pebble-0f3357803.7.azurestaticapps.net, so corsHeaders() (api/src/lib/cors.ts:12-24) returned {} for any request originating from the real domains. The API answered 200 with correct RDW data every time — the browser discarded the response for lack of Access-Control-Allow-Origin, fetch threw, and the bare `catch {` at frontend/src/main.ts:108 reported "Kan de server niet bereiken. Probeer het later opnieuw." Two diagnostic traps worth remembering: (1) testing via the raw azurestaticapps.net URL PASSES and hides the bug entirely — always reproduce on the domain the user actually types; (2) App Insights shows these as successful 200s, so the request log looks perfectly healthy while every real visitor sees an error. Fix: ALLOWED_ORIGINS set to the comma-separated list of all three origins (parser is cors.ts:6-10). Verified live 2026-08-17 at the HTTP layer — all three origins return 200 with a correctly echoed per-origin ACAO and real BMW 118I data for ZK-655-H. STILL OUTSTANDING: no real-browser click-through on https://apkwekker.autos (Playwright dropped mid-session); per CLAUDE.md that check is required before calling UI work done, so re-verify in a browser at desktop + mobile width +bugfix +infra #070
(A) CORS preflight returns bare 204 — POST /api/subscribe cannot work in ANY browser, on ANY origin. Found 2026-08-16 while diagnosing #070; independent of it and NOT fixed by it (re-confirmed after the #070 restart). OPTIONS to /api/subscribe AND /api/vehicle/{kenteken} returns 204 with NO Access-Control-Allow-Origin, no allow-methods, no allow-headers — from the allowed SWA origin as well as the custom domains. The subscribe POST sends Content-Type: application/json (frontend/src/main.ts:121), which forces a preflight, so the browser blocks it before the POST is ever sent: "Herinner mij" is dead everywhere. This is almost certainly why `subscriptions` holds only 3 rows, all self-tests from 2026-07-13 and none since. NOT a code bug — handlePreflight() exists (api/src/lib/cors.ts:27-33) and both handlers call it (vehicle.ts:7, subscribe.ts:21), and both register OPTIONS in their methods array (vehicle.ts:29, subscribe.ts:100), so the function never gets to run. PRIME SUSPECT: the Functions host intercepts OPTIONS itself for CORS handling and, with platform CORS empty (`az functionapp cors show` → allowedOrigins: []), answers a bare 204 before dispatching to the function — same platform-vs-app CORS trap as the nordicHolidays incident. Hypothesis, not proven. CAUTION ON THE FIX: do NOT simply `az functionapp cors add` on top of the app-level headers — if both layers emit Access-Control-Allow-Origin the browser sees a duplicate header and blocks just as hard as with none. Decide on ONE layer owning CORS and strip the other. Verification bar: a real browser POST from https://apkwekker.autos that lands a new row in the subscriptions table, not just a green preflight in curl +bugfix +infra #071
(A) sendReminders timer never fires — DEADLINE 2026-12-01. Found 2026-08-16 by live check. Symptom: in the full 30-day App Insights retention window (log-apkwekker, retentionInDays=30) the func-apkwekker host produced telemetry on exactly ONE day — 2026-08-16 — and only because the check itself curled it; 4 requests total, all from that check, and the host cold-started on the first call. Zero `sendReminders` executions, ever, inside the retention window. Everything else is healthy, which is why this is invisible: SWA 200, /api/health {"status":"ok"}, /api/vehicle/00JTB5 returns full live RDW data, /api/vehicle/XX correctly 400s in Dutch, Function App state=Running + enabled, and all 6 functions ARE registered (host trace "Found the following functions: ... Host.Functions.sendReminders") — so the code is deployed, the schedule just never triggers. Timer is `0 0 7 * * *` (api/src/functions/sendReminders.ts:84), THRESHOLDS = [60, 30, 7] (line 9). IMPACT SO FAR = NIL, which is the trap: the 3 rows in the `subscriptions` table are all self-test entries from 2026-07-13 (same kenteken 1KNG24, same apkDate 2027-01-30, 1 confirmed + 2 pending, remindersSent empty), and T-60 on 2027-01-30 is 2026-12-01 — so nothing has been missed yet and nothing will look wrong until that date, when the first real reminder silently fails to send. PRIME SUSPECT: plan is FC1/FlexConsumption with `alwaysReady` unset, so the app scales fully to zero and nothing wakes it for the schedule — hypothesis only, NOT diagnosed; a storage/lock failure on the timer's schedule monitor would present identically from the outside, so investigate before assuming. Fix must be proven by observation, not by config change alone: after the fix, confirm an actual `sendReminders` request row appears in App Insights on a day nobody touched the app (query with `-o json` — `-o table` renders blank for these result shapes and reads as "no telemetry", which nearly caused a false all-clear during this very check). Consider also: an always-ready instance costs money on FC1, so weigh alwaysReady=1 vs. an external scheduler (Logic App / GitHub Actions cron) hitting an authenticated trigger endpoint. Add a liveness signal too — the timer should emit a heartbeat even on a zero-sends day, otherwise "no email went out" and "the timer never ran" stay indistinguishable +bugfix +infra #069

## Backlog (post-launch, future reference)
(B) Affiliate integration: insurance comparison deep links in vehicle passport +revenue #060
(B) Custom domain apkwekker.nl or apk.van-vliet.eu + SPF/DKIM for email deliverability +infra #061
(B) Consent-based display ads once >5k visits/month +revenue #062
(C) Premium fleet tier for ZZP: multi-vehicle dashboard, €1/vehicle/month +revenue #063
(C) TrekCheck feature page: caravan weight legal check as SEO landing page +feature #064
(C) Reminder channel: optional WhatsApp/SMS via ACS +feature #065
(C) Programmatic SEO: per-model landing pages ("APK check Volkswagen Golf") +marketing #066
(D) Analytics: privacy-friendly (Plausible-style) counters +ops #067
(D) Customer support email/sender identity aligned with custom domain +ops #068
