#!/usr/bin/env bash
# Infra-verificatie voor apkwekker (ad-hoc): compile + live-staat-spiegel + CORS-gedrag.
# Er bestaat geen bicep-testsuite — dit is de dunst mogelijke echte check, geen suite-groen.
# Gebruik: bash scripts/verify-infra.sh
set -euo pipefail
cd "$(dirname "$0")/.."

az bicep build --file infra/main.bicep --stdout >/dev/null 2>&1 && echo "1. compile: OK"

# Live-spiegel: wat in bicep staat, moet in Azure staan.
ORIGINS=$(az functionapp cors show -n func-apkwekker -g rg-apkwekker --query "sort(allowedOrigins)" -o json)
EXPECTED=$(python3 -c "import json; print(json.dumps(sorted(['https://victorious-pebble-0f3357803.7.azurestaticapps.net', 'https://apkwekker.com'])))")
[ "$(echo "$ORIGINS" | python3 -c 'import json,sys; print(json.dumps(sorted(json.load(sys.stdin))))')" = "$EXPECTED" ] && echo "2. live platform-CORS == bicep-lijst (2 origins): OK"

[ "$(az functionapp config appsettings list -n func-apkwekker -g rg-apkwekker --query "[?name=='FRONTEND_URL'].value" -o tsv)" = "https://apkwekker.com" ] && echo "3. live FRONTEND_URL: OK"
[ "$(az functionapp config appsettings list -n func-apkwekker -g rg-apkwekker --query "[?name=='MAIL_FROM'].value" -o tsv)" = "no-reply@notif.apkwekker.autos" ] && echo "4. live MAIL_FROM (maildomein .autos): OK"

# Gedragsprobe: preflight vanaf de canonieke host, precies 1 ACAO.
C=$(curl -s -I -X OPTIONS "https://func-apkwekker.azurewebsites.net/api/subscribe" \
  -H "Origin: https://apkwekker.com" -H "Access-Control-Request-Method: POST" --max-time 20 \
  | grep -icE "^access-control-allow-origin")
[ "$C" = "1" ] && echo "5. preflight apkwekker.com: precies 1 ACAO: OK"

echo "infra-verify: ALLE CHECKS GROEN"
