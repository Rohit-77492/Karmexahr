-- ============================================================
-- KarmexaHR — Migration 004: Full-Text Search & Performance
-- ============================================================

-- ─── FULL TEXT SEARCH ON EMPLOYEES ───────────────────────────

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(first_name, '') || ' ' ||
      COALESCE(last_name, '') || ' ' ||
      COALESCE(email, '') || ' ' ||
      COALESCE(employee_code, '') || ' ' ||
      COALESCE(pan_number, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_employees_search ON employees USING GIN(search_vector);

-- Full text search on candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(first_name, '') || ' ' ||
      COALESCE(last_name, '') || ' ' ||
      COALESCE(email, '') || ' ' ||
      COALESCE(current_company, '') || ' ' ||
      COALESCE(current_designation, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_candidates_search ON candidates USING GIN(search_vector);

-- ─── EMPLOYEE SEARCH FUNCTION ─────────────────────────────────

CREATE OR REPLACE FUNCTION search_employees(
  p_company_id UUID,
  p_query      TEXT,
  p_limit      INTEGER DEFAULT 10
)
RETURNS TABLE (
  id             UUID,
  first_name     TEXT,
  last_name      TEXT,
  email          TEXT,
  employee_code  TEXT,
  department     TEXT,
  designation    TEXT,
  status         employee_status,
  rank           FLOAT4
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.employee_code,
    d.name  AS department,
    dg.name AS designation,
    e.status,
    ts_rank(e.search_vector, query) AS rank
  FROM employees e
  LEFT JOIN departments d  ON d.id = e.department_id
  LEFT JOIN designations dg ON dg.id = e.designation_id,
  to_tsquery('english', p_query || ':*') query
  WHERE e.company_id = p_company_id
    AND e.search_vector @@ query
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── LEAVE BALANCE CARRY FORWARD (run annually) ───────────────

CREATE OR REPLACE FUNCTION carry_forward_leaves(
  p_company_id UUID,
  p_from_year  INTEGER,
  p_to_year    INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- For each employee's current leave balance, carry forward eligible amounts
  INSERT INTO leave_balances (
    company_id, employee_id, policy_id, year,
    allocated, carried_forward
  )
  SELECT
    lb.company_id,
    lb.employee_id,
    lb.policy_id,
    p_to_year,
    lp.days_per_year,
    LEAST(
      GREATEST(lb.balance, 0),
      COALESCE(lp.max_carry_forward, 0)
    )
  FROM leave_balances lb
  JOIN leave_policies lp ON lp.id = lb.policy_id
  WHERE lb.company_id = p_company_id
    AND lb.year       = p_from_year
    AND lp.carry_forward = true
  ON CONFLICT (employee_id, policy_id, year) DO UPDATE
  SET carried_forward = EXCLUDED.carried_forward;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── MONTHLY ATTENDANCE SUMMARY VIEW ─────────────────────────

CREATE OR REPLACE VIEW monthly_attendance_summary AS
SELECT
  a.employee_id,
  a.company_id,
  EXTRACT(YEAR FROM a.date)::INTEGER  AS year,
  EXTRACT(MONTH FROM a.date)::INTEGER AS month,
  COUNT(*) FILTER (WHERE a.type IN ('present','wfh','on_duty'))      AS present_days,
  COUNT(*) FILTER (WHERE a.type = 'wfh')                            AS wfh_days,
  COUNT(*) FILTER (WHERE a.type = 'absent')                         AS absent_days,
  COUNT(*) FILTER (WHERE a.type = 'half_day')                       AS half_days,
  COALESCE(SUM(a.total_hours), 0)                                   AS total_hours,
  COALESCE(SUM(a.overtime_hours), 0)                                AS overtime_hours,
  AVG(EXTRACT(HOUR FROM a.clock_in::time)) FILTER (WHERE a.clock_in IS NOT NULL) AS avg_clock_in_hour
FROM attendance a
GROUP BY a.employee_id, a.company_id, year, month;

-- ─── PAYROLL COMPLIANCE SUMMARY VIEW ─────────────────────────

CREATE OR REPLACE VIEW payroll_compliance_summary AS
SELECT
  pr.company_id,
  pr.year,
  pr.month,
  pr.total_employees,
  SUM(ps.pf_employee)       AS total_pf_employee,
  SUM(ps.pf_employer)       AS total_pf_employer,
  SUM(ps.pf_employee + ps.pf_employer) AS total_pf_remittance,
  SUM(ps.esi_employee)      AS total_esi_employee,
  SUM(ps.esi_employer)      AS total_esi_employer,
  SUM(ps.esi_employee + ps.esi_employer) AS total_esi_remittance,
  SUM(ps.professional_tax)  AS total_pt,
  SUM(ps.income_tax_tds)    AS total_tds,
  SUM(ps.gross_earnings)    AS total_gross,
  SUM(ps.net_pay)           AS total_net
FROM payroll_runs pr
JOIN payslips ps ON ps.run_id = pr.id
WHERE pr.status IN ('processed','paid')
GROUP BY pr.company_id, pr.year, pr.month, pr.total_employees;

-- ─── ANNIVERSARY REMINDERS FUNCTION ─────────────────────────

CREATE OR REPLACE FUNCTION get_upcoming_events(
  p_company_id UUID,
  p_days_ahead INTEGER DEFAULT 7
) RETURNS TABLE (
  event_type   TEXT,
  employee_id  UUID,
  full_name    TEXT,
  event_date   DATE,
  detail       TEXT
) AS $$
BEGIN
  -- Birthdays
  RETURN QUERY
  SELECT
    'birthday'::TEXT,
    e.id,
    e.first_name || ' ' || e.last_name,
    (DATE_TRUNC('year', CURRENT_DATE) + (e.date_of_birth - DATE_TRUNC('year', e.date_of_birth)))::DATE,
    'Birthday'::TEXT
  FROM employees e
  WHERE e.company_id   = p_company_id
    AND e.status       = 'active'
    AND e.date_of_birth IS NOT NULL
    AND (
      DATE_TRUNC('year', CURRENT_DATE) + (e.date_of_birth - DATE_TRUNC('year', e.date_of_birth))
    ) BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead;

  -- Work anniversaries
  RETURN QUERY
  SELECT
    'anniversary'::TEXT,
    e.id,
    e.first_name || ' ' || e.last_name,
    (DATE_TRUNC('year', CURRENT_DATE) + (e.join_date - DATE_TRUNC('year', e.join_date)))::DATE,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.join_date))::TEXT || ' year anniversary'
  FROM employees e
  WHERE e.company_id = p_company_id
    AND e.status     = 'active'
    AND (
      DATE_TRUNC('year', CURRENT_DATE) + (e.join_date - DATE_TRUNC('year', e.join_date))
    ) BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
    AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.join_date)) >= 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── PROBATION CHECK ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_employees_due_confirmation(
  p_company_id    UUID,
  p_days_ahead    INTEGER DEFAULT 14
) RETURNS TABLE (
  employee_id  UUID,
  full_name    TEXT,
  join_date    DATE,
  due_date     DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.first_name || ' ' || e.last_name,
    e.join_date,
    (e.join_date + INTERVAL '6 months')::DATE AS due_date
  FROM employees e
  WHERE e.company_id        = p_company_id
    AND e.status            = 'active'
    AND e.confirmation_date IS NULL
    AND (e.join_date + INTERVAL '6 months')
        BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── ADDITIONAL PERFORMANCE INDEXES ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_payslips_year_month    ON payslips(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_attendance_type        ON attendance(company_id, type, date);
CREATE INDEX IF NOT EXISTS idx_leave_req_dates        ON leave_requests(company_id, from_date, to_date, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status  ON expense_claims(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_company     ON candidates(company_id, stage, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_okrs_owner             ON okrs(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_training_status        ON training_enrollments(company_id, status, employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread   ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
