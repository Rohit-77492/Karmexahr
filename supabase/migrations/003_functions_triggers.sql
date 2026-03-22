-- ============================================================
-- KarmexaHR — Functions, Stored Procedures & Triggers
-- Migration: 003_functions_triggers.sql
-- ============================================================

-- ─── PAYROLL CALCULATION FUNCTION ────────────────────────────

CREATE OR REPLACE FUNCTION calculate_payslip(
  p_employee_id UUID,
  p_company_id  UUID,
  p_month       INTEGER,
  p_year        INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_salary        employee_salaries%ROWTYPE;
  v_attendance    RECORD;
  v_working_days  INTEGER;
  v_present_days  NUMERIC;
  v_lop_days      NUMERIC;
  v_basic         NUMERIC;
  v_hra           NUMERIC;
  v_special       NUMERIC;
  v_gross         NUMERIC;
  v_pf_emp        NUMERIC;
  v_pf_er         NUMERIC;
  v_esi_emp       NUMERIC;
  v_esi_er        NUMERIC;
  v_pt            NUMERIC;
  v_tds           NUMERIC;
  v_net           NUMERIC;
  v_total_ded     NUMERIC;
  v_result        JSONB;
BEGIN
  -- Get current salary
  SELECT * INTO v_salary
  FROM employee_salaries
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_current = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No salary record found');
  END IF;

  -- Count working days in the month (excluding Sat/Sun)
  SELECT COUNT(*) INTO v_working_days
  FROM generate_series(
    date_trunc('month', make_date(p_year, p_month, 1)),
    date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day',
    interval '1 day'
  ) d
  WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);

  -- Subtract company holidays
  SELECT v_working_days - COUNT(*) INTO v_working_days
  FROM holidays
  WHERE company_id = p_company_id
    AND date >= date_trunc('month', make_date(p_year, p_month, 1))
    AND date < date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month'
    AND EXTRACT(DOW FROM date) NOT IN (0, 6)
    AND is_optional = false;

  -- Count present days
  SELECT
    COALESCE(SUM(CASE
      WHEN type = 'present' THEN 1
      WHEN type = 'wfh'     THEN 1
      WHEN type = 'on_duty' THEN 1
      WHEN type = 'half_day' THEN 0.5
      ELSE 0
    END), 0) INTO v_present_days
  FROM attendance
  WHERE employee_id = p_employee_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR  FROM date) = p_year;

  v_lop_days := GREATEST(0, v_working_days - v_present_days);

  -- Calculate earnings
  v_basic   := ROUND((v_salary.ctc / 12) * (v_salary.basic_percent / 100), 2);
  v_hra     := ROUND((v_salary.ctc / 12) * (v_salary.hra_percent   / 100), 2);
  v_special := ROUND((v_salary.ctc / 12) - v_basic - v_hra, 2);

  -- Apply LOP
  IF v_working_days > 0 AND v_lop_days > 0 THEN
    DECLARE
      lop_factor NUMERIC := 1 - (v_lop_days / v_working_days);
    BEGIN
      v_basic   := ROUND(v_basic   * lop_factor, 2);
      v_hra     := ROUND(v_hra     * lop_factor, 2);
      v_special := ROUND(v_special * lop_factor, 2);
    END;
  END IF;

  v_gross := v_basic + v_hra + v_special;

  -- ── PF: Employee 12% of basic (max ₹1,800/month = ₹15,000 basic ceiling) ──
  v_pf_emp := ROUND(LEAST(v_basic, 15000) * 0.12, 2);
  v_pf_er  := v_pf_emp; -- Employer contribution (goes to EPFO)

  -- ── ESI: 0.75% of gross if gross ≤ ₹21,000 ──
  IF v_gross <= 21000 THEN
    v_esi_emp := ROUND(v_gross * 0.0075, 2);
    v_esi_er  := ROUND(v_gross * 0.0325, 2);
  ELSE
    v_esi_emp := 0;
    v_esi_er  := 0;
  END IF;

  -- ── Professional Tax (Karnataka / generic slab) ──
  v_pt := CASE
    WHEN v_gross < 15000  THEN 0
    WHEN v_gross < 20000  THEN 150
    WHEN v_gross < 25000  THEN 175
    ELSE                       200
  END;

  -- ── TDS (simplified monthly TDS — annual projected) ──
  -- Annual gross estimate
  DECLARE
    annual_gross NUMERIC := v_gross * 12;
    standard_ded NUMERIC := 50000; -- Standard deduction FY24-25
    annual_pf    NUMERIC := v_pf_emp * 12;
    taxable      NUMERIC;
    annual_tax   NUMERIC;
  BEGIN
    taxable := annual_gross - standard_ded - annual_pf;
    taxable := GREATEST(taxable, 0);

    -- New regime FY 2024-25
    annual_tax := CASE
      WHEN taxable <= 300000  THEN 0
      WHEN taxable <= 600000  THEN (taxable - 300000) * 0.05
      WHEN taxable <= 900000  THEN 15000 + (taxable - 600000) * 0.10
      WHEN taxable <= 1200000 THEN 45000 + (taxable - 900000) * 0.15
      WHEN taxable <= 1500000 THEN 90000 + (taxable - 1200000) * 0.20
      ELSE                         150000 + (taxable - 1500000) * 0.30
    END;

    -- Add 4% Health & Education Cess
    annual_tax := ROUND(annual_tax * 1.04, 2);
    v_tds := ROUND(annual_tax / 12, 2);
  END;

  -- Totals
  v_total_ded := v_pf_emp + v_esi_emp + v_pt + v_tds;
  v_net       := ROUND(v_gross - v_total_ded, 2);

  v_result := jsonb_build_object(
    'working_days',     v_working_days,
    'present_days',     v_present_days,
    'lop_days',         v_lop_days,
    'basic',            v_basic,
    'hra',              v_hra,
    'special_allowance', v_special,
    'gross_earnings',   v_gross,
    'pf_employee',      v_pf_emp,
    'pf_employer',      v_pf_er,
    'esi_employee',     v_esi_emp,
    'esi_employer',     v_esi_er,
    'professional_tax', v_pt,
    'income_tax_tds',   v_tds,
    'total_deductions', v_total_ded,
    'net_pay',          v_net
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── BULK PAYROLL RUN ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_payroll_run(
  p_run_id    UUID,
  p_company_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_run       payroll_runs%ROWTYPE;
  v_emp       employees%ROWTYPE;
  v_calc      JSONB;
  v_count     INTEGER := 0;
  v_total_gross NUMERIC := 0;
  v_total_ded   NUMERIC := 0;
  v_total_net   NUMERIC := 0;
BEGIN
  SELECT * INTO v_run FROM payroll_runs
  WHERE id = p_run_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Payroll run not found');
  END IF;

  IF v_run.status NOT IN ('draft', 'processing') THEN
    RETURN jsonb_build_object('error', 'Payroll run cannot be processed in current status');
  END IF;

  UPDATE payroll_runs SET status = 'processing' WHERE id = p_run_id;

  -- Process each active employee
  FOR v_emp IN
    SELECT e.* FROM employees e
    WHERE e.company_id = p_company_id
      AND e.status = 'active'
      AND e.join_date <= make_date(v_run.year, v_run.month, 28)
  LOOP
    v_calc := calculate_payslip(v_emp.id, p_company_id, v_run.month, v_run.year);

    IF v_calc ? 'error' THEN
      CONTINUE;
    END IF;

    -- Upsert payslip
    INSERT INTO payslips (
      company_id, run_id, employee_id, month, year,
      working_days, present_days, lop_days,
      basic, hra, special_allowance, gross_earnings,
      pf_employee, pf_employer, esi_employee, esi_employer,
      professional_tax, income_tax_tds,
      total_deductions, net_pay
    ) VALUES (
      p_company_id, p_run_id, v_emp.id, v_run.month, v_run.year,
      (v_calc->>'working_days')::INTEGER,
      (v_calc->>'present_days')::NUMERIC,
      (v_calc->>'lop_days')::NUMERIC,
      (v_calc->>'basic')::NUMERIC,
      (v_calc->>'hra')::NUMERIC,
      (v_calc->>'special_allowance')::NUMERIC,
      (v_calc->>'gross_earnings')::NUMERIC,
      (v_calc->>'pf_employee')::NUMERIC,
      (v_calc->>'pf_employer')::NUMERIC,
      (v_calc->>'esi_employee')::NUMERIC,
      (v_calc->>'esi_employer')::NUMERIC,
      (v_calc->>'professional_tax')::NUMERIC,
      (v_calc->>'income_tax_tds')::NUMERIC,
      (v_calc->>'total_deductions')::NUMERIC,
      (v_calc->>'net_pay')::NUMERIC
    )
    ON CONFLICT (run_id, employee_id) DO UPDATE
    SET
      working_days       = EXCLUDED.working_days,
      present_days       = EXCLUDED.present_days,
      lop_days           = EXCLUDED.lop_days,
      basic              = EXCLUDED.basic,
      hra                = EXCLUDED.hra,
      special_allowance  = EXCLUDED.special_allowance,
      gross_earnings     = EXCLUDED.gross_earnings,
      pf_employee        = EXCLUDED.pf_employee,
      pf_employer        = EXCLUDED.pf_employer,
      esi_employee       = EXCLUDED.esi_employee,
      esi_employer       = EXCLUDED.esi_employer,
      professional_tax   = EXCLUDED.professional_tax,
      income_tax_tds     = EXCLUDED.income_tax_tds,
      total_deductions   = EXCLUDED.total_deductions,
      net_pay            = EXCLUDED.net_pay;

    v_count       := v_count + 1;
    v_total_gross := v_total_gross + (v_calc->>'gross_earnings')::NUMERIC;
    v_total_ded   := v_total_ded   + (v_calc->>'total_deductions')::NUMERIC;
    v_total_net   := v_total_net   + (v_calc->>'net_pay')::NUMERIC;
  END LOOP;

  UPDATE payroll_runs SET
    status           = 'processed',
    total_employees  = v_count,
    total_gross      = v_total_gross,
    total_deductions = v_total_ded,
    total_net        = v_total_net,
    processed_at     = NOW()
  WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'success', true,
    'employees_processed', v_count,
    'total_gross',  v_total_gross,
    'total_net',    v_total_net
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── LEAVE BALANCE INITIALIZATION ────────────────────────────

CREATE OR REPLACE FUNCTION initialize_leave_balances(
  p_employee_id UUID,
  p_company_id  UUID,
  p_year        INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
) RETURNS VOID AS $$
DECLARE
  v_policy leave_policies%ROWTYPE;
  v_emp    employees%ROWTYPE;
BEGIN
  SELECT * INTO v_emp FROM employees WHERE id = p_employee_id;

  FOR v_policy IN
    SELECT * FROM leave_policies
    WHERE company_id = p_company_id
      AND is_active = true
      AND (gender_specific IS NULL OR gender_specific = v_emp.gender)
  LOOP
    INSERT INTO leave_balances (
      company_id, employee_id, policy_id, year, allocated
    )
    VALUES (
      p_company_id, p_employee_id, v_policy.id, p_year,
      v_policy.days_per_year
    )
    ON CONFLICT (employee_id, policy_id, year) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── LEAVE REQUEST → UPDATE BALANCE ──────────────────────────

CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- On approval: deduct from balance
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE leave_balances
    SET used = used + NEW.days
    WHERE employee_id = NEW.employee_id
      AND policy_id   = NEW.policy_id
      AND year        = EXTRACT(YEAR FROM NEW.from_date)::INTEGER;

  -- On revocation/rejection: restore balance
  ELSIF (NEW.status IN ('rejected','revoked','cancelled'))
    AND OLD.status = 'approved' THEN
    UPDATE leave_balances
    SET used = GREATEST(0, used - NEW.days)
    WHERE employee_id = NEW.employee_id
      AND policy_id   = NEW.policy_id
      AND year        = EXTRACT(YEAR FROM NEW.from_date)::INTEGER;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_leave_balance_update
  AFTER UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_approval();

-- ─── ATTENDANCE TOTAL HOURS ───────────────────────────────────

CREATE OR REPLACE FUNCTION compute_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0, 2
    );
    NEW.overtime_hours := GREATEST(0, ROUND(NEW.total_hours - 9, 2));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_hours();

-- ─── EXPENSE CLAIM NUMBERING ──────────────────────────────────

CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM expense_claims
  WHERE company_id = NEW.company_id;
  NEW.claim_number := 'EXP-' || LPAD(v_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_number
  BEFORE INSERT ON expense_claims
  FOR EACH ROW EXECUTE FUNCTION generate_expense_number();

-- ─── EMPLOYEE CODE GENERATION ─────────────────────────────────

CREATE OR REPLACE FUNCTION generate_employee_code(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_prefix TEXT;
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO v_prefix
  FROM companies WHERE id = p_company_id;

  SELECT COUNT(*) + 1 INTO v_count
  FROM employees WHERE company_id = p_company_id;

  RETURN v_prefix || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── AUDIT LOG TRIGGER ────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      company_id, user_id, action, entity_type, entity_id,
      old_values, new_values
    ) VALUES (
      COALESCE(NEW.company_id, OLD.company_id),
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      company_id, user_id, action, entity_type, entity_id, old_values
    ) VALUES (
      OLD.company_id, auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      company_id, user_id, action, entity_type, entity_id, new_values
    ) VALUES (
      NEW.company_id, auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to sensitive tables
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
CREATE TRIGGER audit_payslips  AFTER INSERT OR UPDATE OR DELETE ON payslips  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
CREATE TRIGGER audit_leaves    AFTER INSERT OR UPDATE ON leave_requests       FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- ─── GRATUITY CALCULATION VIEW ───────────────────────────────

CREATE OR REPLACE VIEW employee_gratuity AS
SELECT
  e.id AS employee_id,
  e.company_id,
  e.first_name || ' ' || e.last_name AS full_name,
  e.join_date,
  CURRENT_DATE AS as_of_date,
  DATE_PART('year', AGE(CURRENT_DATE, e.join_date)) AS years_of_service,
  es.basic AS last_drawn_basic,
  -- Gratuity = (15/26) × Last basic × Years of service (eligible after 5 yrs)
  CASE
    WHEN DATE_PART('year', AGE(CURRENT_DATE, e.join_date)) >= 5
    THEN ROUND(
      (15.0 / 26.0) * es.basic * DATE_PART('year', AGE(CURRENT_DATE, e.join_date)),
      2
    )
    ELSE 0
  END AS gratuity_amount,
  CASE
    WHEN DATE_PART('year', AGE(CURRENT_DATE, e.join_date)) >= 5
    THEN true ELSE false
  END AS is_eligible
FROM employees e
JOIN LATERAL (
  SELECT basic FROM payslips p
  WHERE p.employee_id = e.id
  ORDER BY p.year DESC, p.month DESC
  LIMIT 1
) es ON true
WHERE e.status = 'active';
