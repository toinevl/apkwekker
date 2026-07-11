# Build brief — APKwekker API

Build the API in `/home/toine/projects/apkwekker/api/` — Azure Functions v4, Node 20, TypeScript. Work only inside that directory. Do not commit to git and do not deploy. TDD with vitest: tests first, then implement, run until green.

Product: Dutch users enter kenteken + email → email reminders before APK expiry + instant vehicle passport from RDW open data.

## Constraints

- `@azure/functions` v4 model (`app.http` / `app.timer`)
- zod `.strict()` validation
- `@azure/data-tables` with env `STORAGE_CONNECTION`, idempotent createTable (try/catch on already-exists)
- `@azure/communication-email` with env `ACS_CONNECTION` + `MAIL_FROM`, wrapped in mockable `emailClient.ts` that logs instead of sending when `ACS_CONNECTION` unset (never throws in dev mode)
- `cors.ts` reading `ALLOWED_ORIGINS` (comma-separated, default localhost:5173/4280), echoes matching Origin, answers OPTIONS with 204 + headers
- Azure Functions v4 runtime gotcha: `context.error()` exists, `context.log.error()` does NOT — test mocks must mirror the real InvocationContext shape (log is a plain function)
- Dutch user-facing errors; status codes: 400 validation, 404 unknown, 429 rate limit, 502 RDW down, 500 generic Dutch message (details via context.error)

## Endpoints

1. `GET /api/health` → `{status:"ok"}`
2. `GET /api/vehicle/{kenteken}`:
   - normalize: uppercase, strip dashes/spaces; must be 6 alphanumeric else 400 "Ongeldig kenteken."
   - fetch `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=X` (empty array → 404 "Kenteken niet gevonden.")
   - best-effort fuel from `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=X`
   - response passport: kenteken (display-formatted: split letter/digit runs joined with '-'), merk, handelsbenaming, voertuigsoort, bouwjaar (from datum_eerste_toelating), vervaldatum_apk (from vervaldatum_apk_dt or null), catalogusprijs, brandstof, massa_rijklaar, maximum_massa_trekken_ongeremd, maximum_trekken_massa_geremd, apkStatus ('verlopen' | 'binnenkort' <60d | 'geldig' | 'onbekend'), daysUntilApk
   - in-memory 1h cache (Map); 5s AbortController timeout → 502 "RDW is tijdelijk niet bereikbaar."
3. `POST /api/subscribe` `{kenteken, email}` zod strict:
   - rate limit 5/IP/hour in-memory via x-forwarded-for first IP
   - verify kenteken exists at RDW (404 if not)
   - upsert row in table `subscriptions`: partitionKey=kenteken, rowKey=sha256(email) hex, fields: email, kenteken, apkDate, status='pending', confirmToken=randomUUID, unsubscribeToken=randomUUID, createdAt ISO, confirmedAt null, remindersSent ''
   - already confirmed → 200 `{message:"Je bent al aangemeld voor dit kenteken."}`
   - send Dutch confirm email with link `${BASE_URL}/api/confirm?token=...` → 200 `{message:"Check je inbox om je aanmelding te bevestigen."}`
4. `GET /api/confirm?token=` → find by confirmToken (filter scan), set status='confirmed' + confirmedAt, 302 to `${FRONTEND_URL}/bevestigd.html`; unknown token → `${FRONTEND_URL}/ongeldig.html`
5. `GET /api/unsubscribe?token=` → find by unsubscribeToken, delete row, 302 `${FRONTEND_URL}/afgemeld.html`; unknown → `/ongeldig.html`
6. Timer `sendReminders` daily 07:00 UTC (`0 0 7 * * *`): scan confirmed subs, refresh apkDate from RDW (if apkDate moved forward, reset remindersSent — re-keuring happened), thresholds [60,30,7]: if daysUntilApk <= t and t not in remindersSent → send Dutch reminder email (vehicle info + unsubscribe link), append t to remindersSent. Expired (<0) and '0' unsent → "Je APK is verlopen!" once, mark '0'. Per-row errors must not abort the batch; context.error summary at end.

## Structure

```
api/
  package.json        # scripts: build=tsc, test=vitest run
  tsconfig.json
  host.json
  src/index.ts        # registers all functions
  src/functions/*.ts  # one per endpoint + timer
  src/lib/{rdw,cors,kenteken,storage,emailClient,rateLimit,templates}.ts
  test/*.test.ts
```

`BASE_URL` / `FRONTEND_URL` envs with localhost defaults. No secrets in code.

## Quality bar

`npm run build` clean AND `npm test` green — run both, iterate until pass. Cover error paths (400/404/429/502) in tests.

## Report (brief)

Files, test count/status, build status, deviations, prod env vars needed.
