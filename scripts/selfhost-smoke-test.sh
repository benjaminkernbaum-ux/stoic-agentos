#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
#  Stoic AgentOS — Self-Host Smoke Test
# ═══════════════════════════════════════════════════════
#  Verifies a `docker compose up` self-host actually works:
#  builds, boots, and both services answer real requests.
#
#  Usage (from repo root, after `cp .env.selfhost.example .env`
#  and filling in your Supabase project's URL + keys):
#
#    ./scripts/selfhost-smoke-test.sh
#
#  Exits 0 and prints a summary on success; exits 1 with the
#  failing step on any check that doesn't pass. Leaves the stack
#  running on success (`docker compose down` to stop it); tears
#  it down automatically on failure so you don't have to clean up
#  a broken stack by hand.
# ═══════════════════════════════════════════════════════
set -uo pipefail

API_PORT="${API_PORT:-4444}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
API_URL="http://localhost:${API_PORT}"
DASHBOARD_URL="http://localhost:${DASHBOARD_PORT}"
BOOT_TIMEOUT_S=90
STEP=0
FAILED=0

step() { STEP=$((STEP + 1)); echo ""; echo "── [${STEP}] $1"; }
pass() { echo "   ✅ $1"; }
fail() { echo "   ❌ $1"; FAILED=1; }

cleanup_on_failure() {
  if [ "$FAILED" -eq 1 ]; then
    echo ""
    echo "── Smoke test failed — tearing down (logs above are from the running stack) ──"
    docker compose logs --tail=40
    docker compose down
    exit 1
  fi
}
trap cleanup_on_failure EXIT

step "Checking prerequisites"
if [ ! -f .env ]; then
  fail ".env not found. Run: cp .env.selfhost.example .env && edit it with your Supabase project's values."
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  fail "docker is not installed or not on PATH."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  fail "docker compose (v2) is not available."
  exit 1
fi
pass "docker + docker compose found, .env present"

step "Building images"
if ! docker compose build; then
  fail "docker compose build failed — see output above."
  exit 1
fi
pass "images built"

step "Starting the stack"
if ! docker compose up -d; then
  fail "docker compose up failed — see output above."
  exit 1
fi
pass "containers started"

step "Waiting for the API health check (up to ${BOOT_TIMEOUT_S}s)"
elapsed=0
api_healthy=0
while [ "$elapsed" -lt "$BOOT_TIMEOUT_S" ]; do
  if curl -fsS "${API_URL}/health" >/dev/null 2>&1; then
    api_healthy=1
    break
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done
if [ "$api_healthy" -eq 1 ]; then
  pass "API responded to /health after ~${elapsed}s"
else
  fail "API never answered ${API_URL}/health within ${BOOT_TIMEOUT_S}s"
  exit 1
fi

step "Verifying /health payload"
HEALTH_BODY="$(curl -fsS "${API_URL}/health")"
if echo "$HEALTH_BODY" | grep -q '"status"'; then
  pass "response looks like real JSON: ${HEALTH_BODY}"
else
  fail "unexpected /health response: ${HEALTH_BODY}"
  exit 1
fi

step "Verifying the API is actually talking to Supabase (not demo mode)"
# /health/ready returns HTTP 200 even when Supabase is unconfigured or degraded
# (only a hard connection exception 503s) — so the HTTP status alone can't
# catch it. This is exactly the old broken compose's failure mode: booting
# "healthy" while silently running with no real database behind it. Check the
# checks.supabase.status field in the body instead.
READY_BODY="$(curl -fsS "${API_URL}/api/v1/health/ready" || echo '{}')"
SUPABASE_STATUS="$(echo "$READY_BODY" | grep -o '"supabase":{"status":"[a-z_]*"' | grep -o '"status":"[a-z_]*"' | cut -d'"' -f4)"
if [ "$SUPABASE_STATUS" = "ok" ]; then
  pass "Supabase connectivity confirmed (checks.supabase.status = ok)"
else
  fail "Supabase connectivity check failed: checks.supabase.status = '${SUPABASE_STATUS:-unknown}'. Check SUPABASE_URL / SUPABASE_SERVICE_KEY in .env. Full response: ${READY_BODY}"
  exit 1
fi

step "Verifying the dashboard serves the SPA"
DASH_STATUS="$(curl -fsS -o /dev/null -w '%{http_code}' "${DASHBOARD_URL}/" || echo "000")"
if [ "$DASH_STATUS" = "200" ]; then
  pass "dashboard responded 200 at ${DASHBOARD_URL}/"
else
  fail "dashboard returned ${DASH_STATUS} at ${DASHBOARD_URL}/"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✅ Self-host smoke test passed."
echo "    API:       ${API_URL}  (health: ${API_URL}/health)"
echo "    Dashboard: ${DASHBOARD_URL}"
echo ""
echo " Stack is left running. Stop it with: docker compose down"
echo "═══════════════════════════════════════════════════════"
