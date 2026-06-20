#!/usr/bin/env bash
# Oriel dashboard screenshot harness — orchestrator.
#
# Brings up the disposable ha-demo-harness (a synthetic, location-free demo HA with
# Oriel + the optional components installed), waits until it's ready (incl. the
# injected recorder history the sparkline needs), then renders the two-tier
# comparison (FLOOR = optional components genuinely removed, WITH = present) plus
# the strategy editor into docs/images/.
#
# Usage:
#   ./run.sh                 # bring up, render, tear down
#   KEEP_UP=1 ./run.sh       # leave the demo running afterwards (faster re-runs)
#
# The demo HA's admin token is a fixed PUBLIC token baked into the disposable image
# on purpose (it controls nothing real) — see ha-demo-harness/README.md "The public
# token". We read it from the harness checkout; nothing secret lives here.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="${HA_DEMO_HARNESS_DIR:-$(cd "$HERE/../../../ha-demo-harness" 2>/dev/null && pwd || true)}"
HA_URL="${HA_URL:-http://localhost:8127}"

if [[ -z "$HARNESS_DIR" || ! -f "$HARNESS_DIR/docker-compose.yml" ]]; then
  echo "ha-demo-harness not found. Clone/locate it and set HA_DEMO_HARNESS_DIR." >&2
  echo "Expected default: $HERE/../../../ha-demo-harness" >&2
  exit 1
fi

echo "==> bringing up ha-demo-harness ($HARNESS_DIR)"
( cd "$HARNESS_DIR" && docker compose up -d )

TOKEN_FILE="$HARNESS_DIR/seed/.storage/.PUBLIC_TOKEN"
[[ -f "$TOKEN_FILE" ]] || { echo "public token not found at $TOKEN_FILE" >&2; exit 1; }
TOKEN="$(cat "$TOKEN_FILE")"

echo "==> waiting for HA API"
until [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 -H "Authorization: Bearer $TOKEN" "$HA_URL/api/" 2>/dev/null)" == "200" ]]; do sleep 4; done

echo "==> waiting for injected sparkline recorder history"
for _ in $(seq 1 60); do
  pts="$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$HA_URL/api/history/period?filter_entity_id=sensor.living_room_temperature&minimal_response" 2>/dev/null \
    | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log((JSON.parse(d)[0]||[]).length)}catch{console.log(0)}})")"
  [[ "${pts:-0}" -gt 1 ]] && break
  sleep 3
done
echo "    history points: ${pts:-0}"

echo "==> rendering shots"
HA_URL="$HA_URL" HA_TOKEN="$TOKEN" node "$HERE/shoot.mjs"

if [[ "${KEEP_UP:-0}" != "1" ]]; then
  echo "==> tearing down (set KEEP_UP=1 to keep it running)"
  ( cd "$HARNESS_DIR" && docker compose down )
fi
echo "==> done -> docs/images/"
