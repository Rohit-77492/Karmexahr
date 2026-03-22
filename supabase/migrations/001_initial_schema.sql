-- ============================================================
-- KarmexaHR — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ─── ENUM TYPES ──────────────────────────────────────────────

CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on_leave', 'terminated', 'notice_period');
CREATE TYPE leave_type AS ENUM ('casual', 'sick', 'annual', 'maternity', 'paternity', 'comp_off', 'lwp', 'wfh');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'revoked');
CREATE TYPE attendance_type AS ENUM ('present', 'absent', 'wfh', 'half_day', 'on_duty', 'holiday', 'weekend');
CREATE TYPE payroll_status AS ENUM ('draft', 'processing', 'processed', 'paid', 'failed');
CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid');
CREATE TYPE expense_category AS ENUM ('travel', 'meals', 'accommodation', 'equipment', 'internet', 'mobile', 'training', 'medical', 'other');
CREATE TYPE job_status AS ENUM ('draft', 'open', 'paused', 'closed', 'cancelled');
CREATE TYPE candidate_stage AS ENUM ('applied', 'screened', 'interview_1', 'interview_2', 'interview_3', 'offer', 'hired', 'rejected');
CREATE TYPE review_cycle_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'intern', 'consultant');
CREATE TYPE plan_type AS ENUM ('free', 'starter', 'growth', 'enterprise');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'hr_manager', 'manager', 'employee');
CREATE TYPE document_type AS ENUM ('offer_letter', 'appointment_letter', 'payslip', 'form_16', 'experience_letter', 'relieving_letter', 'identity', 'address_proof', 'education', 'other');

-- ─── COMPANIES ───────────────────────────────────────────────

CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  website         TEXT,
  industry        TEXT,
  size_range      TEXT,
  gst_number      TEXT,
  pan_number      TEXT,
  cin_number      TEXT,
  registered_address JSONB DEFAULT '{}',
  billing_address JSONB DEFAULT '{}',
  plan            plan_type NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  max_employees   INTEGER DEFAULT 10,
  fiscal_year_start INTEGER DEFAULT 4, -- April
  work_week       TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
  timezone        TEXT DEFAULT 'Asia/Kolkata',
  currency        TEXT DEFAULT 'INR',
  settings        JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFILES (linked to Supabase Auth) ──────────────────────

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  role            user_role NOT NULL DEFAULT 'employee',
  is_active       BOOLEAN DEFAULT true,
  last_seen_at    TIMESTAMPTZ,
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMPANY MEMBERS (multi-company membership) ───────────────

CREATE TABLE company_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'employee',
  is_active       BOOLEAN DEFAULT true,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- ─── DEPARTMENTS ──────────────────────────────────────────────

CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  description     TEXT,
  head_id         UUID,
  parent_id       UUID REFERENCES departments(id),
  cost_center     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DESIGNATIONS ─────────────────────────────────────────────

CREATE TABLE designations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  level           INTEGER DEFAULT 1,
  department_id   UUID REFERENCES departments(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMPLOYEES ────────────────────────────────────────────────

CREATE TABLE employees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES profiles(id),
  employee_code       TEXT NOT NULL,
  -- Personal
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  personal_email      TEXT,
  phone               TEXT,
  date_of_birth       DATE,
  gender              gender,
  blood_group         TEXT,
  nationality         TEXT DEFAULT 'Indian',
  -- Employment
  department_id       UUID REFERENCES departments(id),
  designation_id      UUID REFERENCES designations(id),
  employment_type     employment_type DEFAULT 'full_time',
  manager_id          UUID REFERENCES employees(id),
  status              employee_status DEFAULT 'active',
  join_date           DATE NOT NULL,
  confirmation_date   DATE,
  exit_date           DATE,
  notice_period_days  INTEGER DEFAULT 30,
  -- Location
  work_location       TEXT DEFAULT 'office',
  office_location     TEXT,
  -- Identity docs
  pan_number          TEXT,
  aadhaar_number      TEXT,
  uan_number          TEXT, -- PF UAN
  esic_number         TEXT,
  passport_number     TEXT,
  -- Bank details
  bank_name           TEXT,
  bank_account_number TEXT,
  bank_ifsc           TEXT,
  bank_account_type   TEXT DEFAULT 'savings',
  -- Emergency contact
  emergency_contact   JSONB DEFAULT '{}',
  -- Address
  current_address     JSONB DEFAULT '{}',
  permanent_address   JSONB DEFAULT '{}',
  -- Metadata
  custom_fields       JSONB DEFAULT '{}',
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_code),
  UNIQUE(company_id, email)
);

-- FK back-reference (after table creation)
ALTER TABLE departments ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ─── SALARY STRUCTURES ────────────────────────────────────────

CREATE TABLE salary_structures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL, -- e.g. "Standard CTC", "Senior Band"
  description     TEXT,
  components      JSONB NOT NULL DEFAULT '[]',
  -- components: [{name, type(earning|deduction), calc_type(fixed|percent), value, is_taxable}]
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMPLOYEE SALARIES ────────────────────────────────────────

CREATE TABLE employee_salaries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_structure_id UUID REFERENCES salary_structures(id),
  ctc                 NUMERIC(12,2) NOT NULL,
  basic_percent       NUMERIC(5,2) DEFAULT 40.00, -- % of CTC
  hra_percent         NUMERIC(5,2) DEFAULT 20.00,
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  is_current          BOOLEAN DEFAULT true,
  remarks             TEXT,
  created_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYROLL RUNS ─────────────────────────────────────────────

CREATE TABLE payroll_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INTEGER NOT NULL,
  status          payroll_status DEFAULT 'draft',
  total_employees INTEGER DEFAULT 0,
  total_gross     NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_net       NUMERIC(14,2) DEFAULT 0,
  processed_at    TIMESTAMPTZ,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  remarks         TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month, year)
);

-- ─── PAYSLIPS ─────────────────────────────────────────────────

CREATE TABLE payslips (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id              UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month               INTEGER NOT NULL,
  year                INTEGER NOT NULL,
  working_days        INTEGER DEFAULT 0,
  present_days        NUMERIC(5,2) DEFAULT 0,
  lop_days            NUMERIC(5,2) DEFAULT 0, -- Loss of Pay
  -- Earnings
  basic               NUMERIC(10,2) DEFAULT 0,
  hra                 NUMERIC(10,2) DEFAULT 0,
  special_allowance   NUMERIC(10,2) DEFAULT 0,
  conveyance          NUMERIC(10,2) DEFAULT 0,
  medical_allowance   NUMERIC(10,2) DEFAULT 0,
  other_earnings      JSONB DEFAULT '[]',
  gross_earnings      NUMERIC(10,2) DEFAULT 0,
  -- Deductions
  pf_employee         NUMERIC(10,2) DEFAULT 0, -- 12% of Basic
  pf_employer         NUMERIC(10,2) DEFAULT 0, -- 12% of Basic (cost)
  esi_employee        NUMERIC(10,2) DEFAULT 0, -- 0.75% of gross
  esi_employer        NUMERIC(10,2) DEFAULT 0, -- 3.25% of gross
  professional_tax    NUMERIC(10,2) DEFAULT 0,
  income_tax_tds      NUMERIC(10,2) DEFAULT 0,
  loan_deduction      NUMERIC(10,2) DEFAULT 0,
  advance_deduction   NUMERIC(10,2) DEFAULT 0,
  other_deductions    JSONB DEFAULT '[]',
  total_deductions    NUMERIC(10,2) DEFAULT 0,
  -- Net
  net_pay             NUMERIC(10,2) DEFAULT 0,
  -- YTD
  ytd_gross           NUMERIC(12,2) DEFAULT 0,
  ytd_tds             NUMERIC(12,2) DEFAULT 0,
  -- Status
  is_published        BOOLEAN DEFAULT false,
  published_at        TIMESTAMPTZ,
  pdf_url             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id, employee_id)
);

-- ─── LEAVE POLICIES ───────────────────────────────────────────

CREATE TABLE leave_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  leave_type      leave_type NOT NULL,
  days_per_year   NUMERIC(5,1) NOT NULL,
  carry_forward   BOOLEAN DEFAULT false,
  max_carry_forward NUMERIC(5,1) DEFAULT 0,
  encashable      BOOLEAN DEFAULT false,
  requires_document BOOLEAN DEFAULT false,
  min_days        NUMERIC(3,1) DEFAULT 0.5,
  max_days        NUMERIC(5,1),
  notice_days     INTEGER DEFAULT 0,
  accrual_type    TEXT DEFAULT 'yearly', -- yearly, monthly, none
  gender_specific gender,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEAVE BALANCES ───────────────────────────────────────────

CREATE TABLE leave_balances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  policy_id       UUID NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  allocated       NUMERIC(5,1) DEFAULT 0,
  used            NUMERIC(5,1) DEFAULT 0,
  carried_forward NUMERIC(5,1) DEFAULT 0,
  encashed        NUMERIC(5,1) DEFAULT 0,
  balance         NUMERIC(5,1) GENERATED ALWAYS AS (allocated + carried_forward - used - encashed) STORED,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, policy_id, year)
);

-- ─── LEAVE REQUESTS ───────────────────────────────────────────

CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  policy_id       UUID NOT NULL REFERENCES leave_policies(id),
  leave_type      leave_type NOT NULL,
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  days            NUMERIC(5,1) NOT NULL,
  reason          TEXT,
  attachment_url  TEXT,
  status          leave_status DEFAULT 'pending',
  applied_on      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by     UUID REFERENCES employees(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HOLIDAYS ─────────────────────────────────────────────────

CREATE TABLE holidays (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  date            DATE NOT NULL,
  holiday_type    TEXT DEFAULT 'national', -- national, festival, company, optional
  is_optional     BOOLEAN DEFAULT false,
  applicable_to   TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, date, name)
);

-- ─── ATTENDANCE ───────────────────────────────────────────────

CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  clock_in        TIMESTAMPTZ,
  clock_out       TIMESTAMPTZ,
  total_hours     NUMERIC(5,2),
  overtime_hours  NUMERIC(5,2) DEFAULT 0,
  type            attendance_type DEFAULT 'present',
  source          TEXT DEFAULT 'manual', -- manual, biometric, app, web
  location        JSONB, -- {lat, lng, address}
  ip_address      INET,
  notes           TEXT,
  is_regularized  BOOLEAN DEFAULT false,
  regularized_by  UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ─── EXPENSE CLAIMS ───────────────────────────────────────────

CREATE TABLE expense_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  claim_number    TEXT NOT NULL,
  title           TEXT NOT NULL,
  category        expense_category NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'INR',
  expense_date    DATE NOT NULL,
  description     TEXT,
  receipt_url     TEXT,
  status          expense_status DEFAULT 'submitted',
  approved_by     UUID REFERENCES employees(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── JOBS (Recruitment) ───────────────────────────────────────

CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  title           TEXT NOT NULL,
  description     TEXT,
  requirements    TEXT,
  location        TEXT,
  employment_type employment_type DEFAULT 'full_time',
  experience_min  NUMERIC(4,1) DEFAULT 0,
  experience_max  NUMERIC(4,1),
  salary_min      NUMERIC(12,2),
  salary_max      NUMERIC(12,2),
  openings        INTEGER DEFAULT 1,
  status          job_status DEFAULT 'open',
  deadline        DATE,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CANDIDATES ───────────────────────────────────────────────

CREATE TABLE candidates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  current_company TEXT,
  current_designation TEXT,
  experience_years NUMERIC(4,1),
  current_ctc     NUMERIC(12,2),
  expected_ctc    NUMERIC(12,2),
  notice_period   INTEGER, -- days
  resume_url      TEXT,
  stage           candidate_stage DEFAULT 'applied',
  score           NUMERIC(3,1),
  tags            TEXT[],
  source          TEXT DEFAULT 'direct', -- direct, referral, linkedin, naukri, ...
  referred_by     UUID REFERENCES employees(id),
  assigned_to     UUID REFERENCES employees(id),
  notes           TEXT,
  is_blacklisted  BOOLEAN DEFAULT false,
  applied_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INTERVIEWS ───────────────────────────────────────────────

CREATE TABLE interviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id),
  round           INTEGER NOT NULL DEFAULT 1,
  title           TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INTEGER DEFAULT 60,
  mode            TEXT DEFAULT 'video', -- video, in_person, phone
  meet_link       TEXT,
  interviewers    UUID[] DEFAULT ARRAY[]::UUID[],
  status          TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  feedback        JSONB DEFAULT '{}',
  overall_rating  NUMERIC(3,1),
  recommendation  TEXT, -- hire, reject, on_hold, next_round
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PERFORMANCE REVIEW CYCLES ────────────────────────────────

CREATE TABLE review_cycles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  cycle_type      TEXT DEFAULT 'quarterly', -- quarterly, half_yearly, annual
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  review_start    DATE,
  review_end      DATE,
  status          review_cycle_status DEFAULT 'draft',
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PERFORMANCE REVIEWS ──────────────────────────────────────

CREATE TABLE performance_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id        UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id     UUID REFERENCES employees(id),
  self_rating     NUMERIC(3,1),
  manager_rating  NUMERIC(3,1),
  overall_rating  NUMERIC(3,1),
  goals           JSONB DEFAULT '[]',
  competencies    JSONB DEFAULT '[]',
  strengths       TEXT,
  improvements    TEXT,
  comments        TEXT,
  status          TEXT DEFAULT 'pending', -- pending, self_review, manager_review, completed
  submitted_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, employee_id)
);

-- ─── OKRs ─────────────────────────────────────────────────────

CREATE TABLE okrs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES okrs(id),
  cycle_id        UUID REFERENCES review_cycles(id),
  title           TEXT NOT NULL,
  description     TEXT,
  level           TEXT DEFAULT 'individual', -- company, department, individual
  progress        NUMERIC(5,2) DEFAULT 0,
  status          TEXT DEFAULT 'on_track', -- on_track, at_risk, behind, completed
  due_date        DATE,
  key_results     JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAINING COURSES ─────────────────────────────────────────

CREATE TABLE training_courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  difficulty      TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  duration_hours  NUMERIC(5,1),
  instructor      TEXT,
  content_url     TEXT,
  thumbnail_url   TEXT,
  is_mandatory    BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAINING ENROLLMENTS ─────────────────────────────────────

CREATE TABLE training_enrollments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  progress        NUMERIC(5,2) DEFAULT 0,
  score           NUMERIC(5,2),
  certificate_url TEXT,
  status          TEXT DEFAULT 'enrolled', -- enrolled, in_progress, completed, failed
  UNIQUE(course_id, employee_id)
);

-- ─── DOCUMENTS ────────────────────────────────────────────────

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  doc_type        document_type NOT NULL,
  title           TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  is_verified     BOOLEAN DEFAULT false,
  is_confidential BOOLEAN DEFAULT false,
  expiry_date     DATE,
  uploaded_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANNOUNCEMENTS ────────────────────────────────────────────

CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  category        TEXT DEFAULT 'general',
  audience        TEXT DEFAULT 'all', -- all, department, role
  audience_ids    UUID[],
  is_pinned       BOOLEAN DEFAULT false,
  published_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────

-- Company
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_plan ON companies(plan);

-- Company members
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);

-- Employees
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_user ON employees(user_id);

-- Attendance
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_company_date ON attendance(company_id, date);

-- Leave requests
CREATE INDEX idx_leave_company_status ON leave_requests(company_id, status);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_dates ON leave_requests(from_date, to_date);

-- Payroll
CREATE INDEX idx_payroll_company_period ON payroll_runs(company_id, year, month);
CREATE INDEX idx_payslips_run ON payslips(run_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);

-- Recruitment
CREATE INDEX idx_candidates_job ON candidates(job_id);
CREATE INDEX idx_candidates_stage ON candidates(company_id, stage);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Audit
CREATE INDEX idx_audit_company ON audit_logs(company_id, created_at DESC);

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payroll_runs_updated BEFORE UPDATE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leave_requests_updated BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expense_claims_updated BEFORE UPDATE ON expense_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AUTO PROFILE ON SIGNUP ───────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
