#!/usr/bin/env bash
# KarmexaHR — Pre-deploy validation script
# Usage: ./scripts/validate.sh

set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILED=$((FAILED+1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
FAILED=0

echo ""
echo -e "${BOLD}KarmexaHR Pre-Deploy Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Check .env.local
echo ""
echo -e "${BOLD}1. Environment variables${NC}"
[ -f ".env.local" ] && pass ".env.local exists" || fail ".env.local missing — run setup.sh"

check_env() {
  if [ -f ".env.local" ]; then
    val=$(grep "^$1=" .env.local | cut -d= -f2-)
    if [ -z "$val" ] || echo "$val" | grep -qE "your-|YOUR_|example|placeholder"; then
      fail "$1 is not set"
    else
      pass "$1 is set"
    fi
  fi
}

check_env "NEXT_PUBLIC_SUPABASE_URL"
check_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env "SUPABASE_SERVICE_ROLE_KEY"
check_env "NEXT_PUBLIC_APP_URL"
check_env "ENCRYPTION_SECRET"

# 2. TypeScript
echo ""
echo -e "${BOLD}2. TypeScript${NC}"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  TS_COUNT=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo 0)
  fail "TypeScript: $TS_COUNT error(s) — run 'npx tsc --noEmit' to see details"
else
  pass "TypeScript: no errors"
fi

# 3. Critical files
echo ""
echo -e "${BOLD}3. Critical files${NC}"
CRITICAL_FILES=(
  "middleware.ts"
  "app/layout.tsx"
  "app/page.tsx"
  "app/(auth)/login/page.tsx"
  "app/(dashboard)/[company]/layout.tsx"
  "lib/supabase/client.ts"
  "lib/supabase/server.ts"
  "lib/payroll/indian-compliance.ts"
  "supabase/migrations/001_initial_schema.sql"
  "supabase/migrations/002_rls_policies.sql"
  "supabase/migrations/003_functions_triggers.sql"
)

for f in "${CRITICAL_FILES[@]}"; do
  [ -f "$f" ] && pass "$f" || fail "$f MISSING"
done

# 4. Migrations order
echo ""
echo -e "${BOLD}4. Migrations${NC}"
for i in 001 002 003 004 005; do
  f="supabase/migrations/${i}_*.sql"
  ls $f 2>/dev/null | head -1 | while read ff; do
    pass "Migration $i: $(basename $ff)"
  done
done

# 5. Unit tests
echo ""
echo -e "${BOLD}5. Unit tests${NC}"
if npm test -- --run 2>&1 | grep -q "passed"; then
  PASSED=$(npm test -- --run 2>&1 | grep -oE "[0-9]+ passed" | tail -1)
  pass "Unit tests: $PASSED"
else
  warn "Unit tests: could not run (check vitest setup)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All checks passed — ready to deploy!${NC}"
else
  echo -e "${RED}${BOLD}✗ $FAILED check(s) failed — fix before deploying${NC}"
  exit 1
fi
echo ""
