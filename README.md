# KarmexaHR — Enterprise HRMS

> Full-stack, multi-company HRMS built with **Next.js 15 · Supabase · Vercel**.  
> Keka & DarwinBox-grade features — Indian statutory compliance included.

---

## Features

| Module | Capabilities |
|--------|-------------|
| 👥 **People** | Employee directory, profiles, org chart, onboarding |
| 🕐 **Attendance** | Web/mobile clock-in, WFH, overtime, heatmap |
| 🗓️ **Leave** | 7 leave types, approval workflows, balance tracking |
| 💰 **Payroll** | CTC builder, PF/ESI/TDS/PT auto-calc, payslip PDF |
| 🧾 **Expenses** | Claims, receipts, approval workflow, reimbursement |
| 🏢 **Recruitment** | ATS, Kanban pipeline, interview scheduling, offer letters |
| 📈 **Performance** | Review cycles, OKRs, 360° feedback, competency matrix |
| 🎓 **Training** | LMS, course progress, certifications |
| 📊 **Analytics** | Real-time dashboards, custom reports |
| 🏭 **Multi-Company** | Isolated data per company via RLS, company switcher |

### Indian Statutory Compliance
- ✅ PF: Employee 12% + Employer 12% (EPS + EPF + EDLI + Admin)
- ✅ ESI: Employee 0.75% + Employer 3.25% (for gross ≤ ₹21,000)
- ✅ TDS: New Tax Regime FY 2024-25 with all slabs + rebate u/s 87A
- ✅ Professional Tax: State-wise slabs (KA, MH, TN, WB, AP)
- ✅ Gratuity: Payment of Gratuity Act 1972 (eligible after 5 years)

---

## Tech Stack

```
Frontend:   Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui
Backend:    Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
Deployment: Vercel (CDN + Edge) · Supabase Hosted
Email:      Resend
Payments:   Razorpay (payroll disbursement)
Monitoring: Sentry + Vercel Analytics
CI/CD:      GitHub Actions
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/karmexahr.git
cd karmexahr
npm install
cp .env.example .env.local
```

### 2. Set up Supabase

#### Option A: Supabase Hosted (Recommended for production)

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Copy your project URL and keys into `.env.local`
3. Run migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase db seed    # Optional: load sample data
```

#### Option B: Self-hosted Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase stack
supabase start

# Apply migrations
supabase db reset

# Your local URLs will be:
# API: http://localhost:54321
# Studio: http://localhost:54323
```

### 3. Configure environment

```bash
# .env.local — fill in your values

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_your_key
```

### 4. Enable Google SSO (optional)

1. Supabase Dashboard → Authentication → Providers → Google
2. Add your Google OAuth Client ID & Secret
3. Add `http://localhost:3000/auth/callback` as authorized redirect URI

### 5. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment

### Vercel + Supabase Hosted (Recommended)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Set custom domain: `app.karmexahr.com` → Vercel settings
5. Auto-deploy on every push to `main` ✅

### Custom Domain Setup

```
app.karmexahr.com     → Vercel (CNAME: cname.vercel-dns.com)
```

In Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://app.karmexahr.com
Redirect URLs: https://app.karmexahr.com/auth/callback
```

### Self-hosted Supabase on VPS

```bash
# On your Ubuntu 22.04 VPS
git clone https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
# Edit .env with your secrets
docker compose up -d

# Run KarmexaHR migrations against self-hosted
SUPABASE_DB_URL=postgresql://postgres:password@your-vps:5432/postgres \
npx supabase db push --db-url $SUPABASE_DB_URL
```

---

## Database Schema

All tables include `company_id` with **Row Level Security** policies ensuring complete data isolation between companies.

```
companies           → Multi-tenant root
profiles            → Linked to Supabase Auth users
company_members     → User ↔ Company membership with roles
employees           → Full employee records
departments         → Hierarchical dept structure
designations        → Job titles / levels
salary_structures   → CTC component templates
employee_salaries   → Historical salary records
payroll_runs        → Monthly payroll batches
payslips            → Individual payslip calculations
leave_policies      → Configurable leave rules
leave_balances      → Per-employee leave tracking
leave_requests      → Leave applications + approvals
holidays            → Company & national holidays
attendance          → Daily clock-in/out records
expense_claims      → Employee expense submissions
jobs                → Open positions (ATS)
candidates          → Applicant tracking
interviews          → Interview scheduling
review_cycles       → Performance review periods
performance_reviews → Individual appraisals
okrs                → Objectives & Key Results
training_courses    → LMS courses
training_enrollments→ Enrollment & progress
documents           → Document vault
announcements       → Company-wide announcements
audit_logs          → Full change history
notifications       → In-app notification feed
```

---

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | All companies, billing, global settings |
| `admin` | Full company access, can manage HR settings |
| `hr_manager` | Employee data, payroll, leaves, recruitment |
| `manager` | Team attendance, approve leaves/expenses |
| `employee` | Own profile, attendance, leaves, payslips |

---

## Payroll Compliance

The compliance engine is in `lib/payroll/indian-compliance.ts`:

```typescript
import { buildCTCBreakdown, calculateTDS, calculatePF, calculateGratuity } from '@/lib/payroll/indian-compliance'

// Full CTC breakdown for ₹12L CTC employee in Karnataka
const breakdown = buildCTCBreakdown(1200000, {
  basicPercent: 40,
  hraPercent: 20,
  stateCode: 'KA',
  regime: 'new',
})
// Returns: earnings, deductions, employer contributions, net take-home
```

---

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # TypeScript check
npm run lint             # ESLint
npm test                 # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run db:generate-types # Regenerate Supabase types
npm run db:push          # Push migrations to Supabase
npm run db:seed          # Seed demo data
```

---

## GitHub Actions CI/CD

Every push to `main`:
1. TypeScript type check + ESLint
2. Vitest unit tests
3. Supabase migration validation
4. Deploy to Vercel production
5. Run DB migrations on production Supabase

Every PR:
1. All quality checks
2. Deploy to Vercel preview URL
3. Playwright E2E against preview
4. Auto-comment preview URL on PR

---

## Support

- 📧 support@karmexahr.com
- 📚 docs.karmexahr.com
- 🐛 GitHub Issues

---

## License

MIT © KarmexaHR
