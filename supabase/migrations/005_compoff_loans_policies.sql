-- ============================================================
-- KarmexaHR — Migration 005: Comp-Off & Regularization
-- ============================================================

-- ─── COMP-OFF REQUESTS ────────────────────────────────────────

CREATE TABLE comp_off_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  worked_on       DATE NOT NULL,  -- The holiday/weekend they worked
  reason          TEXT NOT NULL,
  comp_off_date   DATE,           -- When they want to take the comp-off
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','availed')),
  approved_by     UUID REFERENCES employees(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comp_off_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compoff_select" ON comp_off_requests FOR SELECT USING (
  company_id = ANY(auth_user_company_ids())
);
CREATE POLICY "compoff_insert" ON comp_off_requests FOR INSERT WITH CHECK (
  employee_id = auth_employee_id(company_id) OR is_hr_or_admin(company_id)
);
CREATE POLICY "compoff_update" ON comp_off_requests FOR UPDATE USING (
  is_hr_or_admin(company_id) OR
  EXISTS (SELECT 1 FROM employees e WHERE e.id = comp_off_requests.employee_id AND e.manager_id = auth_employee_id(company_id))
);

-- ─── ATTENDANCE REGULARIZATION ────────────────────────────────

CREATE TABLE attendance_regularization (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_id   UUID REFERENCES attendance(id),
  date            DATE NOT NULL,
  requested_clock_in  TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  reason          TEXT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_regularization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg_select" ON attendance_regularization FOR SELECT USING (
  is_hr_or_admin(company_id) OR
  employee_id = auth_employee_id(company_id) OR
  EXISTS (SELECT 1 FROM employees e WHERE e.id = attendance_regularization.employee_id AND e.manager_id = auth_employee_id(company_id))
);
CREATE POLICY "reg_insert" ON attendance_regularization FOR INSERT WITH CHECK (
  employee_id = auth_employee_id(company_id) OR is_hr_or_admin(company_id)
);
CREATE POLICY "reg_update" ON attendance_regularization FOR UPDATE USING (is_hr_or_admin(company_id));

-- Auto-apply regularization on approval
CREATE OR REPLACE FUNCTION apply_attendance_regularization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update or insert attendance record
    INSERT INTO attendance (
      company_id, employee_id, date, clock_in, clock_out, type, source, is_regularized, regularized_by
    ) VALUES (
      NEW.company_id, NEW.employee_id, NEW.date,
      NEW.requested_clock_in, NEW.requested_clock_out,
      'present', 'regularization', true, NEW.approved_by
    )
    ON CONFLICT (employee_id, date) DO UPDATE SET
      clock_in       = EXCLUDED.clock_in,
      clock_out      = EXCLUDED.clock_out,
      type           = 'present',
      is_regularized = true,
      regularized_by = EXCLUDED.regularized_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_apply_regularization
  AFTER UPDATE ON attendance_regularization
  FOR EACH ROW EXECUTE FUNCTION apply_attendance_regularization();

-- ─── SALARY REVISIONS HISTORY ─────────────────────────────────

CREATE OR REPLACE FUNCTION create_salary_revision(
  p_employee_id    UUID,
  p_company_id     UUID,
  p_new_ctc        NUMERIC,
  p_effective_from DATE,
  p_remarks        TEXT DEFAULT NULL,
  p_created_by     UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Close the current salary record
  UPDATE employee_salaries
  SET is_current = false, effective_to = p_effective_from - 1
  WHERE employee_id = p_employee_id
    AND company_id  = p_company_id
    AND is_current  = true;

  -- Create new salary record
  INSERT INTO employee_salaries (
    company_id, employee_id, ctc, effective_from, is_current,
    remarks, created_by
  ) VALUES (
    p_company_id, p_employee_id, p_new_ctc, p_effective_from, true,
    p_remarks, p_created_by
  ) RETURNING id INTO v_new_id;

  -- Audit log
  INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, new_values)
  VALUES (p_company_id, p_created_by, 'SALARY_REVISED', 'employees', p_employee_id,
    jsonb_build_object('new_ctc', p_new_ctc, 'effective_from', p_effective_from));

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── EXPENSE LIMIT POLICIES ───────────────────────────────────

CREATE TABLE expense_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  monthly_limit   NUMERIC(10,2),
  per_claim_limit NUMERIC(10,2),
  requires_receipt BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  applicable_to   TEXT DEFAULT 'all', -- all, department, role, level
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp_pol_select" ON expense_policies FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "exp_pol_modify" ON expense_policies FOR ALL USING (is_hr_or_admin(company_id));

-- ─── EMPLOYEE LOANS ───────────────────────────────────────────

CREATE TABLE employee_loans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_amount     NUMERIC(12,2) NOT NULL,
  emi_amount      NUMERIC(10,2) NOT NULL,
  tenure_months   INTEGER NOT NULL,
  disbursed_on    DATE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('pending','active','closed','written_off')),
  outstanding     NUMERIC(12,2),
  remarks         TEXT,
  approved_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select" ON employee_loans FOR SELECT USING (
  is_hr_or_admin(company_id) OR employee_id = auth_employee_id(company_id)
);
CREATE POLICY "loans_modify" ON employee_loans FOR ALL USING (is_hr_or_admin(company_id));

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_comp_off_employee ON comp_off_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_regularization_date ON attendance_regularization(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_loans_employee ON employee_loans(employee_id, status);
