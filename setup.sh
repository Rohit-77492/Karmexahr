#!/usr/bin/env bash
# ================================================================
# KarmexaHR — Automated Setup Script
# Run: chmod +x setup.sh && ./setup.sh
# ================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step()    { echo -e "\n${BOLD}${BLUE}▶ $1${NC}"; }
success() { echo -e "  ${GREEN}✓ $1${NC}"; }
warn()    { echo -e "  ${YELLOW}⚠ $1${NC}"; }
error()   { echo -e "  ${RED}✗ $1${NC}"; exit 1; }
info()    { echo -e "  ${CYAN}  $1${NC}"; }

echo ""
echo -e "${BOLD}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        KarmexaHR Setup Wizard          ║${NC}"
echo -e "${BOLD}║   Enterprise HRMS · Indian Compliance  ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites check ───────────────────────────────────────
step "Checking prerequisites"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    success "$1 found ($(command -v "$1"))"
  else
    error "$1 is required but not installed. $2"
  fi
}

check_cmd node  "Install from https://nodejs.org (v20+ required)"
check_cmd npm   "Comes with Node.js"
check_cmd git   "Install from https://git-scm.com"

# Node version check
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  error "Node.js v20+ required. Current: v$NODE_VER"
fi
success "Node.js v$(node -v | sed 's/v//')"

# Check for Supabase CLI (optional but recommended)
if command -v supabase &>/dev/null; then
  success "Supabase CLI found"
  HAS_SUPABASE=true
else
  warn "Supabase CLI not found. Install with: npm install -g supabase"
  info "You can still run the app with a hosted Supabase project."
  HAS_SUPABASE=false
fi

# ── Install dependencies ──────────────────────────────────────
step "Installing npm dependencies"
npm install --legacy-peer-deps
success "Dependencies installed"

# ── Environment setup ─────────────────────────────────────────
step "Setting up environment"

if [ -f ".env.local" ]; then
  warn ".env.local already exists — skipping creation"
else
  cp .env.example .env.local
  success "Created .env.local from template"
fi

# ── Collect Supabase credentials ─────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Supabase Configuration${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  You need a Supabase project. Create one free at:"
echo -e "  ${CYAN}https://supabase.com${NC}"
echo ""
echo "  Then find your keys at:"
echo "  Project Settings → API → Project URL & anon key"
echo ""

read -p "  Enter your Supabase Project URL (e.g. https://xxx.supabase.co): " SUPABASE_URL
read -p "  Enter your Supabase Anon Key (eyJ...): " SUPABASE_ANON_KEY
read -p "  Enter your Supabase Service Role Key (eyJ...): " -s SUPABASE_SERVICE_KEY
echo ""

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  warn "Supabase credentials not provided. Edit .env.local manually before starting."
else
  # Update .env.local with real values
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" .env.local
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env.local
    sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" .env.local
  else
    # Linux
    sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" .env.local
    sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env.local
    sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" .env.local
  fi
  success "Supabase credentials written to .env.local"
fi

# Optional: App URL
read -p "  App URL (press Enter for http://localhost:3000): " APP_URL
APP_URL=${APP_URL:-http://localhost:3000}
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env.local
else
  sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env.local
fi
success "App URL set to: $APP_URL"

# Generate encryption secret
ENCRYPTION_SECRET=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|ENCRYPTION_SECRET=.*|ENCRYPTION_SECRET=$ENCRYPTION_SECRET|" .env.local
else
  sed -i "s|ENCRYPTION_SECRET=.*|ENCRYPTION_SECRET=$ENCRYPTION_SECRET|" .env.local
fi
success "Generated encryption secret"

# Optional: Resend email
echo ""
read -p "  Resend API Key (optional, for emails — press Enter to skip): " RESEND_KEY
if [ -n "$RESEND_KEY" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|RESEND_API_KEY=.*|RESEND_API_KEY=$RESEND_KEY|" .env.local
  else
    sed -i "s|RESEND_API_KEY=.*|RESEND_API_KEY=$RESEND_KEY|" .env.local
  fi
  success "Resend API key set"
else
  warn "Email notifications will be disabled (no RESEND_API_KEY)"
fi

# ── Database setup ────────────────────────────────────────────
step "Database setup"

if [ "$HAS_SUPABASE" = true ] && [ -n "${SUPABASE_URL:-}" ]; then
  echo ""
  echo "  Choose database setup method:"
  echo "  1) supabase db push (via Supabase CLI — recommended)"
  echo "  2) Run migrations manually in Supabase SQL editor"
  echo "  3) Skip (I'll do it manually)"
  read -p "  Choice [1/2/3]: " DB_CHOICE

  if [ "${DB_CHOICE:-1}" = "1" ]; then
    # Try to link and push
    PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | cut -d. -f1)
    info "Linking to Supabase project: $PROJECT_REF"
    
    if supabase link --project-ref "$PROJECT_REF" 2>/dev/null; then
      success "Linked to Supabase project"
      
      info "Running database migrations (001 → 005)..."
      if supabase db push; then
        success "All migrations applied successfully"
        
        read -p "  Run seed data? (demo companies/departments/holidays) [y/N]: " DO_SEED
        if [[ "${DO_SEED:-n}" =~ ^[Yy]$ ]]; then
          supabase db seed --file supabase/seed.sql 2>/dev/null && success "Seed data loaded" || warn "Seed failed — run manually if needed"
        fi
      else
        warn "Migration push failed. Run manually in Supabase SQL editor."
        info "Files to run in order:"
        info "  supabase/migrations/001_initial_schema.sql"
        info "  supabase/migrations/002_rls_policies.sql"
        info "  supabase/migrations/003_functions_triggers.sql"
        info "  supabase/migrations/004_search_performance.sql"
        info "  supabase/migrations/005_compoff_loans_policies.sql"
      fi
    else
      warn "Could not link automatically. Run migrations manually."
    fi
  elif [ "${DB_CHOICE:-1}" = "2" ]; then
    echo ""
    echo -e "  ${YELLOW}Run these SQL files in your Supabase SQL editor:${NC}"
    echo "  (Project → SQL Editor → New Query)"
    for f in supabase/migrations/00*.sql; do
      echo "  → $f"
    done
  fi
else
  warn "Skipping database setup (no Supabase CLI or URL)"
  info "Run migrations manually in your Supabase SQL editor"
fi

# ── Auth email templates ───────────────────────────────────────
step "Configuring Supabase Auth"
echo ""
if [ -n "${SUPABASE_URL:-}" ]; then
  echo "  Configure these in Supabase Dashboard → Authentication → URL Configuration:"
  echo ""
  echo -e "  ${CYAN}Site URL:${NC}         $APP_URL"
  echo -e "  ${CYAN}Redirect URLs:${NC}    $APP_URL/**"
  echo ""
  echo "  For Google SSO → Authentication → Providers → Google"
  echo "  (Add Client ID + Secret from Google Cloud Console)"
else
  info "Configure auth redirect URLs after setting SUPABASE_URL"
fi

# ── Supabase Storage buckets ──────────────────────────────────
step "Storage bucket setup"

if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_KEY:-}" ]; then
  info "Creating storage buckets..."
  
  # Create documents bucket via API
  BUCKET_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/storage/v1/bucket" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"id":"documents","name":"documents","public":false,"fileSizeLimit":52428800}' 2>/dev/null)
  
  if echo "$BUCKET_RESPONSE" | grep -q '"name"'; then
    success "documents bucket created"
  else
    warn "documents bucket may already exist or creation failed — create manually in Supabase Dashboard → Storage"
  fi

  # Create avatars bucket (public)
  AVATAR_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/storage/v1/bucket" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"id":"avatars","name":"avatars","public":true,"fileSizeLimit":5242880}' 2>/dev/null)
  
  if echo "$AVATAR_RESPONSE" | grep -q '"name"'; then
    success "avatars bucket created (public)"
  else
    warn "avatars bucket may already exist"
  fi
else
  warn "Skipping storage setup (provide SUPABASE_URL + SERVICE_ROLE_KEY)"
fi

# ── Type generation ───────────────────────────────────────────
step "TypeScript type check"

if [ "$HAS_SUPABASE" = true ] && [ -n "${SUPABASE_URL:-}" ]; then
  info "You can regenerate Supabase types anytime with:"
  info "  npm run db:generate-types"
fi

# Run TS check without erroring the script
info "Running TypeScript check..."
if npx tsc --noEmit 2>&1 | grep -c "error TS" > /dev/null 2>&1; then
  TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
  if [ "${TS_ERRORS:-0}" -gt 0 ]; then
    warn "$TS_ERRORS TypeScript error(s) found. Run 'npx tsc --noEmit' to review."
  else
    success "TypeScript: no errors"
  fi
fi

# ── Build verification ────────────────────────────────────────
step "Build verification"

read -p "  Run a test build now? (takes ~60s) [y/N]: " DO_BUILD
if [[ "${DO_BUILD:-n}" =~ ^[Yy]$ ]]; then
  info "Running next build..."
  if npm run build; then
    success "Build succeeded!"
  else
    warn "Build failed — check errors above. Dev mode will still work."
  fi
else
  info "Skipping build (run 'npm run build' manually before deploying)"
fi

# ── Git setup ─────────────────────────────────────────────────
step "Git repository setup"

if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "feat: initial KarmexaHR setup"
  success "Git repository initialized with initial commit"
  echo ""
  info "Push to GitHub:"
  info "  git remote add origin https://github.com/YOUR_ORG/karmexahr.git"
  info "  git push -u origin main"
else
  success "Git repository already exists"
fi

# ── Vercel setup ──────────────────────────────────────────────
step "Vercel deployment (optional)"

if command -v vercel &>/dev/null; then
  read -p "  Deploy to Vercel now? [y/N]: " DO_VERCEL
  if [[ "${DO_VERCEL:-n}" =~ ^[Yy]$ ]]; then
    vercel
  fi
else
  info "To deploy: npm install -g vercel && vercel"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  ✓ KarmexaHR Setup Complete!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Start development server:${NC}"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo -e "  ${BOLD}Open in browser:${NC}"
echo -e "  ${CYAN}$APP_URL${NC}"
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo "  npm run dev              → Start dev server"
echo "  npm run build            → Production build"
echo "  npm test                 → Unit tests (Vitest)"
echo "  npm run test:e2e         → E2E tests (Playwright)"
echo "  npm run type-check       → TypeScript check"
echo "  npm run db:generate-types → Regenerate Supabase types"
echo ""
echo -e "  ${BOLD}First login:${NC}"
echo "  1. Go to $APP_URL/register"
echo "  2. Create your account"
echo "  3. The onboarding wizard will guide you through company setup"
echo ""
echo -e "  ${BOLD}Docs:${NC} README.md · DEPLOYMENT.md"
echo ""
