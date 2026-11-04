# Runbook: DNS-control audit, canonical host & ACS deliverability — apkwekker

> **STATUS 2026-11-04: EXECUTIE VOLTOOID.** §4 is uitgevoerd (notif.apkwekker.autos live, SPF/DKIM Verified, gotcha §4.1b ontdekt tijdens executie). Canonieke host is sinds 2026-11-04 **apkwekker.com** (zie wishlist #088); apkwekker.autos en apkwekker.stoncoo.com 301'en erheen. Dit document blijft als historische referentie + herhaalrecept.

Status: **READ-ONLY audit + runbook** (executed 2026-10-30, subscription `2dbeb3f1-e45d-4207-a7e9-185330aad74b`, rg-apkwekker).
Covers wishlist **#061** (canonical domain + email sender identity) and **#087** (execution prep).
**No DNS or Azure state was changed.** Every mutating step below is gated behind a decision in
[§7 Decisions list](#7-decisions-list-owner-gated).

---

## 1. Current state (audited facts)

### 1.1 DNS hosting — where the records live

| Fact | Value | Source |
|---|---|---|
| `apkwekker.autos` nameservers | `maceio/salvador/curitiba/fortaleza.ns.porkbun.com` | `dig NS apkwekker.autos` |
| `stoncoo.com` nameservers | same four Porkbun NS | `dig NS stoncoo.com` |
| Azure DNS zones in subscription | **none** | `az network dns zone list` → `[]` |
| Apex TXT on `apkwekker.autos` | `"_ulmx1evrwyf8j7qce2jocg86l735qha"` (Porkbun verification), `"v=spf1 include:_spf.porkbun.com ~all"` | `dig TXT` |
| MX on `apkwekker.autos` | `10 fwd1.porkbun.com`, `20 fwd2.porkbun.com` (Porkbun email forwarding) | `dig MX` |
| `apkwekker.autos` apex → SWA | resolves via Porkbun ALIAS/flattening to `victorious-pebble-0f3357803.7.azurestaticapps.net` | `dig` |
| `www.apkwekker.autos` | CNAME → same SWA, **but not bound in SWA** → TLS handshake fails (`curl` exit 60, cert doesn't cover `www`) | `dig` + `curl https://www.apkwekker.autos/` |
| `apkwekker.stoncoo.com` | CNAME → same SWA, bound, status `Ready` | `az staticwebapp hostname list` |

**Answer to "can we set records ourselves": YES — all records for both zones are managed in the
Porkbun dashboard** (DNS Management per zone). There is no Azure DNS zone, so nothing is in IaC;
DNS changes are hand-edits in Porkbun. This requires Porkbun account access → **decision D1**.

Note: the Porkbun SPF/MX on `apkwekker.autos` are Porkbun *email forwarding* artifacts. They do not
conflict with an ACS sender domain as long as the ACS mail-from lives on a **subdomain** (§4.1),
because ACS puts its SPF TXT on that subdomain, not the apex.

### 1.2 Frontend hosts (swa-apkwekker, SKU Free)

- Default host: `victorious-pebble-0f3357803.7.azurestaticapps.net`
- Custom hostnames bound & `Ready`: `apkwekker.autos`, `apkwekker.stoncoo.com`
- **Both serve HTTP 200 for `/` — no host-based redirect exists** → duplicate content (wishlist #061 point 1).
- `https://www.apkwekker.autos/` is broken (TLS mismatch, host not bound) — an unresolved leftover pointing at the SWA.

### 1.3 Email (acs-apkwekker / email-apkwekker)

- Only domain resource: `AzureManagedDomain` (`domainManagement: AzureManaged`, all five verifications `Verified`).
- Live sender: `MAIL_FROM = DoNotReply@2ef6ab8c-eb17-47d9-ad63-d18c592ae426.azurecomm.net` (confirmed both live and in `infra/main.bicep`).
- `_dmarc.apkwekker.autos` / `_dmarc.stoncoo.com`: no records (expected — the managed domain's DMARC lives under `...azurecomm.net`).
- **`api/src/lib/emailClient.ts` does NOT set a `List-Unsubscribe` header** — `beginSend()` sends only subject/html/plainText. Gmail/Yahoo bulk-sender rules (Feb 2024) effectively require `List-Unsubscribe` (+ `List-Unsubscribe-Post`) for unsolicited bulk mail; reminder mails qualify. Gap to fix with the custom domain (§4.5).

### 1.4 Config propagation rule (from #061 / commit 85e85ad)

`ALLOWED_ORIGINS`, `BASE_URL`, `FRONTEND_URL`, `MAIL_FROM` are declared in `infra/main.bicep`.
Any hostname/email change **must be made there and deployed**; `az functionapp config appsettings set`
hand-edits are wiped on the next deploy.

---

## 2. Canonical host recommendation

**Recommendation: `https://apkwekker.autos` is the canonical host; 301 everything else to it.**

| | `apkwekker.autos` (recommended) | `apkwekker.stoncoo.com` |
|---|---|---|
| Brand | Own brandable name, matches product ("APK wekker") | Personal/company subdomain — reads as a side project, weak NL consumer trust for a paid service |
| SEO | Clean apex, future per-model landing pages (#066) accumulate under one brand | Would fork or dilute the same signals |
| Independence | Own zone; can move hosting/providers without touching `stoncoo.com` | Lifetime coupled to the `stoncoo.com` zone (shared personal infra — a Porkbun change there breaks the product) |
| Email | Sender domain `notif.apkwekker.autos` aligns with the site (users see "mail from apkwekker.autos") | Sender would be `@stoncoo.com`-derived — mismatch with what users see in the address bar hurts spam-folder odds |
| Cost | Already registered, already bound, already serving | Already bound |

Trade-off accepted by choosing `.autos`: `.stoncoo.com` keeps working during the transition window
(both hosts stay in `ALLOWED_ORIGINS` until the redirect is proven), then the SWA binding is removed.

Also unresolved: `www.apkwekker.autos` currently resolves but errors on TLS. Either bind `www` in SWA
(and 301 it too) or delete the `www` CNAME in Porkbun → **decision D3**. And per #061: `apkwekker.nl`
/ `apk.van-vliet.eu` are no longer needed now that `.autos` serves → **decision D4**.

---

## 3. Host redirect on Azure Static Web Apps

**Hard constraint:** `staticwebapp.config.json` routes match **paths only, not Host headers** — SWA has
no built-in apex→www or host→host canonicalization. One of the options below is required.

### Option A (recommended): Porkbun URL-forward record, 301

1. Porkbun → `stoncoo.com` → DNS → change the `apkwekker` record to a **URL redirect record**:
   `apkwekker.stoncoo.com` → `https://apkwekker.autos` (permanent / 301, no masking).
2. Verify: `curl -sI https://apkwekker.stoncoo.com/` → `301`, `Location: https://apkwekker.autos/`.
3. Only after the redirect is proven: remove the SWA binding
   `az staticwebapp hostname delete -n swa-apkwekker -g rg-apkwekker --hostname apkwekker.stoncoo.com`,
   and then remove `https://apkwekker.stoncoo.com` from `ALLOWED_ORIGINS` in `infra/main.bicep` + redeploy.
4. Same pattern can 301 `www.apkwekker.autos` if you choose to drop it (D3).

Pros: zero cost, redirect served at the DNS provider's edge, no app code. Cons: depends on Porkbun
availability for that host; redirect is config, not IaC.

### Option B: SWA managed function that 301s on Host header

Free SKU includes managed functions. Add a function:

```ts
export async function canonicalRedirect(req: HttpRequest): Promise<HttpResponseInit> {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (host === "apkwekker.autos") return { status: 404 }; // never matched on canonical host
  return { status: 301, headers: { Location: `https://apkwekker.autos${new URL(req.url).pathname}` } };
}
```

plus a catch-all route in `staticwebapp.config.json` (`"*"` → the function, excluded on the canonical
host). Cons: managed-function cold start on the redirect path; code to own. Pros: everything lives in
the repo, works for any future domain.

### Option C: Azure Front Door Standard/ Premium in front of the SWA

Real rule-engine 301s + one cert for all hosts + WAF option. Cons: extra monthly cost and a new moving
part for a free-tier site. Only if more domains are planned. Overkill today.

**Recommendation: A.** Rollback for A: set the `apkwekker.stoncoo.com` CNAME back to
`victorious-pebble-0f3357803.7.azurestaticapps.net` and re-add the hostname binding.

---

## 4. ACS custom sender domain runbook (SPF / DKIM / DMARC)

Target end-state: mail from `no-reply@notif.apkwekker.autos`, SPF + DKIM + DMARC all `Verified`,
`domainManagement = CustomerManaged`, real external mailbox delivery proven.

### 4.1 Provision the custom domain resource

Use a **subdomain** (`notif.apkwekker.autos` suggested), never the apex: the apex already carries
Porkbun forwarding SPF/MX, and ACS must own the SPF TXT of exactly the mail-from domain.

Portal: rg-apkwekker → `email-apkwekker` → *Connect domain* → domain name `notif.apkwekker.autos`,
domain management **CustomerManaged**.
CLI equivalent (adjust location to the email service's):

```bash
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/2dbeb3f1-e45d-4207-a7e9-185330aad74b/resourceGroups/rg-apkwekker/providers/Microsoft.Communication/emailServices/email-apkwekker/domains/notif.apkwekker.autos?api-version=2023-06-01-preview" \
  --body '{"location":"westeurope","properties":{"domainManagement":"CustomerManaged"}}'
```

### 4.1b Link the domain to the Communication Service (ONTBREEK in de eerste versie van dit runbook)

Een nieuw domein-resource onder `email-apkwekker` is nog NIET zichtbaar voor `acs-apkwekker`.
Zonder deze stap faalt elke send met `DomainNotLinked` (404) — en retourneert subscribe een 500
(gezien 2026-10-30; propagatie van de link duurt tot ~1 min na de PATCH). Voeg het domein toe aan
`properties.linkedDomains` van de Communication Service, naast het bestaande AzureManagedDomain:

```bash
az rest --method PATCH \
  --url "https://management.azure.com/subscriptions/2dbeb3f1-e45d-4207-a7e9-185330aad74b/resourceGroups/rg-apkwekker/providers/Microsoft.Communication/CommunicationServices/acs-apkwekker?api-version=2023-04-01" \
  --body '{"properties":{"linkedDomains":["<id AzureManagedDomain>","<id notif.apkwekker.autos>"]}}'
```

### 4.2 Read the verification records — copy them VERBATIM into Porkbun

```bash
az rest --method GET \
  --url "https://management.azure.com/subscriptions/2dbeb3f1-e45d-4207-a7e9-185330aad74b/resourceGroups/rg-apkwekker/providers/Microsoft.Communication/emailServices/email-apkwekker/domains/notif.apkwekker.autos?api-version=2023-06-01-preview" \
  --query "properties.verificationRecords" -o json
```

Do **not** hand-typ values from any docs — selectors and tokens are resource-specific. Expect ~4 records:

| Record | Name (under apkwekker.autos) | Type | Typical shape |
|---|---|---|---|
| SPF | `notif` | TXT | `v=spf1 include:swc.spf.protection.outlook.com -all` |
| DKIM 1 | `selector1._domainkey.notif` | CNAME | `selector1-<guid>.<...>.azurecomm.net` (from Azure) |
| DKIM 2 | `selector2._domainkey.notif` | CNAME | `selector2-<guid>.<...>.azurecomm.net` (from Azure) |
| DMARC | `_dmarc` (apex-level) | TXT | `v=DMARC1; p=none` — upgrade per §4.6 |

In Porkbun: add these under zone `apkwekker.autos`. TTL default (600) is fine. Leave the apex
Porkbun SPF/MX untouched — no overlap with `notif`.

### 4.3 Verify

Portal: domain blade → *Verify*. CLI:

```bash
az rest --method POST \
  --url "https://management.azure.com/subscriptions/2dbeb3f1-e45d-4207-a7e9-185330aad74b/resourceGroups/rg-apkwekker/providers/Microsoft.Communication/emailServices/email-apkwekker/domains/notif.apkwekker.autos/initiateVerification?api-version=2023-06-01-preview" \
  --body '{"verificationTypes":["Domain","SPF","DKIM","DMARC"]}'
```

Poll (DNS propagation minutes to ~1h):

```bash
az rest --method GET --url "<same GET as 4.2>" \
  --query "properties.verificationStates" -o json   # every entry must reach Verified
```

### 4.4 Create the MailFrom address

Portal: `acs-apkwekker` → the connected custom domain → *MailFrom addresses* → e.g. `no-reply` →
final sender `no-reply@notif.apkwekker.autos`. (The old `DoNotReply@...azurecomm.net` stays valid
until you switch config.)

### 4.5 Propagate config — in `infra/main.bicep`, NOT via az CLI

1. `MAIL_FROM` → `no-reply@notif.apkwekker.autos`.
2. Keep `ALLOWED_ORIGINS` with **both** frontend hosts until the redirect (§3) is live and verified;
   then drop the `.stoncoo.com` entry in the same PR as the binding removal.
3. Deploy infra; confirm live: `az functionapp config appsettings list -n func-apkwekker -g rg-apkwekker`.

### 4.6 Add List-Unsubscribe headers (code change, `api/src/lib/emailClient.ts`)

```ts
this.client.beginSend({
  senderAddress: this.from,
  content: { subject: mail.subject, html: mail.html, plainText: mail.plainText },
  recipients: { to: [{ address: mail.to }] },
  headers: [
    { name: "List-Unsubscribe", value: `<${unsubscribeUrl}>` },
    { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
  ],
} as EmailMessage);
```

(`unsubscribeUrl` already exists in `sendReminders.ts`; thread it through `OutgoingEmail`.)
One-click `List-Unsubscribe` is effectively mandatory for bulk senders at Gmail/Yahoo since 2024.

### 4.7 DMARC policy

Start `v=DMARC1; p=none; rua=mailto:<dmarc-reports@apkwekker.autos>` (or a dedicated inbox), watch
reports ~2 weeks, then tighten to `p=quarantine` → `p=reject`. **decision D7** (which rua mailbox,
when to tighten).

### 4.8 Prove by observation (per #061 step 4)

1. Trigger a real confirmation mail to an **external, non-TU/e** mailbox.
2. Open raw headers; require: `spf=pass` (mailfrom domain `notif.apkwekker.autos`),
   `dkim=pass` with `d=notif.apkwekker.autos`, `dmarc=pass`, `List-Unsubscribe` present.
3. Require inbox placement (not spam). ACS portal "Verified" is NOT the acceptance criterion.

---

## 5. Execution order (after decisions)

1. (D1) Confirm Porkbun dashboard access.
2. (D2) Canonical = `apkwekker.autos` → proceed.
3. §4.1–4.3 ACS custom domain + records + verify (independent of the redirect — do first, it's the deliverability gap).
4. §4.4–4.6 MailFrom + bicep MAIL_FROM + List-Unsubscribe code → deploy → §4.8 proof.
5. (D5/D6) Redirect `apkwekker.stoncoo.com` per chosen option; verify 301; remove SWA binding.
6. (D3) Resolve `www.apkwekker.autos` (bind or delete CNAME).
7. Remove `.stoncoo.com` from `ALLOWED_ORIGINS` in `infra/main.bicep`; deploy; full QA (#083).

## 6. Rollback

- ACS custom domain: delete `notif.apkwekker.autos` domain resource + its DNS records; `MAIL_FROM` back to the managed sender.
- Redirect A: restore CNAME to the SWA + re-add hostname binding; keep `ALLOWED_ORIGINS` until proven.

## 7. Decisions list (owner-gated)

- **D1** Porkbun dashboard access available for `apkwekker.autos` and `stoncoo.com` (who holds the login)?
- **D2** Confirm canonical host = `https://apkwekker.autos`.
- **D3** `www.apkwekker.autos`: bind in SWA and 301 it, or delete the CNAME?
- **D4** Formally drop `apkwekker.nl` / `apk.van-vliet.eu` as candidates? (Recommended: drop.)
- **D5** Redirect mechanism for `apkwekker.stoncoo.com`: Option A (Porkbun 301, recommended) / B (SWA managed function) / C (Front Door)?
- **D6** Remove the `apkwekker.stoncoo.com` SWA binding after the redirect is proven? (Recommended: yes.)
- **D7** Mail-from subdomain + sender address (proposed `no-reply@notif.apkwekker.autos`) and the DMARC `rua` mailbox; approve the `p=none → quarantine → reject` timeline.
- **D8** Approve the `infra/main.bicep` changes (MAIL_FROM now; ALLOWED_ORIGINS cleanup after step 5) — changes land there, not via az CLI.
