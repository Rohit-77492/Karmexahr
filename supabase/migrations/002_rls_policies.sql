-- ============================================================
-- KarmexaHR — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ─── HELPER FUNCTIONS ─────────────────────────────────────────

-- Returns company_ids the current user belongs to
CREATE OR REPLACE FUNCTION auth_user_company_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the user's role in a specific company
CREATE OR REPLACE FUNCTION auth_user_role(p_company_id UUID)
RETURNS user_role AS $$
  SELECT role FROM company_members
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns employee_id for current user in a company
CREATE OR REPLACE FUNCTION auth_employee_id(p_company_id UUID)
RETURNS UUID AS $$
  SELECT id FROM employees
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is HR/Admin in a company
CREATE OR REPLACE FUNCTION is_hr_or_admin(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND role IN ('super_admin','admin','hr_manager')
      AND is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is super_admin globally
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── COMPANIES ────────────────────────────────────────────────

CREATE POLICY "companies_select_members"
  ON companies FOR SELECT
  USING (id = ANY(auth_user_company_ids()) OR is_super_admin());

CREATE POLICY "companies_update_admin"
  ON companies FOR UPDATE
  USING (is_hr_or_admin(id) OR is_super_admin());

CREATE POLICY "companies_insert_super"
  ON companies FOR INSERT
  WITH CHECK (is_super_admin());

-- ─── PROFILES ─────────────────────────────────────────────────

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin());

CREATE POLICY "profiles_select_coworkers"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
    )
  );

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─── COMPANY MEMBERS ──────────────────────────────────────────

CREATE POLICY "members_select"
  ON company_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR company_id = ANY(auth_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "members_insert_admin"
  ON company_members FOR INSERT
  WITH CHECK (is_hr_or_admin(company_id) OR is_super_admin());

CREATE POLICY "members_update_admin"
  ON company_members FOR UPDATE
  USING (is_hr_or_admin(company_id) OR is_super_admin());

-- ─── GENERIC COMPANY-SCOPED POLICY HELPER ─────────────────────
-- (departments, designations, holidays, salary_structures, leave_policies,
--  review_cycles, training_courses, announcements)

CREATE POLICY "departments_select" ON departments FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "departments_modify" ON departments FOR ALL USING (is_hr_or_admin(company_id) OR is_super_admin());

CREATE POLICY "designations_select" ON designations FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "designations_modify" ON designations FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "holidays_select" ON holidays FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "holidays_modify" ON holidays FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "salary_structures_select" ON salary_structures FOR SELECT USING (company_id = ANY(auth_user_company_ids()) AND is_hr_or_admin(company_id));
CREATE POLICY "salary_structures_modify" ON salary_structures FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "leave_policies_select" ON leave_policies FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "leave_policies_modify" ON leave_policies FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "review_cycles_select" ON review_cycles FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "review_cycles_modify" ON review_cycles FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "training_courses_select" ON training_courses FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "training_courses_modify" ON training_courses FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "announcements_modify" ON announcements FOR ALL USING (is_hr_or_admin(company_id));

-- ─── EMPLOYEES ────────────────────────────────────────────────

CREATE POLICY "employees_select"
  ON employees FOR SELECT
  USING (company_id = ANY(auth_user_company_ids()));

CREATE POLICY "employees_insert_hr"
  ON employees FOR INSERT
  WITH CHECK (is_hr_or_admin(company_id));

CREATE POLICY "employees_update_hr_or_self"
  ON employees FOR UPDATE
  USING (
    is_hr_or_admin(company_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "employees_delete_admin"
  ON employees FOR DELETE
  USING (is_hr_or_admin(company_id));

-- ─── EMPLOYEE SALARIES ────────────────────────────────────────

CREATE POLICY "salaries_select_hr_or_self"
  ON employee_salaries FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

CREATE POLICY "salaries_modify_hr"
  ON employee_salaries FOR ALL
  USING (is_hr_or_admin(company_id));

-- ─── PAYROLL RUNS ─────────────────────────────────────────────

CREATE POLICY "payroll_runs_select_hr"
  ON payroll_runs FOR SELECT
  USING (is_hr_or_admin(company_id) OR is_super_admin());

CREATE POLICY "payroll_runs_modify_hr"
  ON payroll_runs FOR ALL
  USING (is_hr_or_admin(company_id));

-- ─── PAYSLIPS ─────────────────────────────────────────────────

CREATE POLICY "payslips_select_hr_or_own"
  ON payslips FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

CREATE POLICY "payslips_modify_hr"
  ON payslips FOR ALL
  USING (is_hr_or_admin(company_id));

-- ─── LEAVE BALANCES ───────────────────────────────────────────

CREATE POLICY "leave_balances_select"
  ON leave_balances FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

CREATE POLICY "leave_balances_modify_hr"
  ON leave_balances FOR ALL
  USING (is_hr_or_admin(company_id));

-- ─── LEAVE REQUESTS ───────────────────────────────────────────

CREATE POLICY "leave_requests_select"
  ON leave_requests FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
    -- managers see their reports
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND e.manager_id = auth_employee_id(company_id)
    )
  );

CREATE POLICY "leave_requests_insert_self"
  ON leave_requests FOR INSERT
  WITH CHECK (
    employee_id = auth_employee_id(company_id)
    OR is_hr_or_admin(company_id)
  );

CREATE POLICY "leave_requests_update"
  ON leave_requests FOR UPDATE
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND e.manager_id = auth_employee_id(company_id)
    )
  );

-- ─── ATTENDANCE ───────────────────────────────────────────────

CREATE POLICY "attendance_select"
  ON attendance FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = attendance.employee_id
        AND e.manager_id = auth_employee_id(company_id)
    )
  );

CREATE POLICY "attendance_insert"
  ON attendance FOR INSERT
  WITH CHECK (
    employee_id = auth_employee_id(company_id)
    OR is_hr_or_admin(company_id)
  );

CREATE POLICY "attendance_update"
  ON attendance FOR UPDATE
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

-- ─── EXPENSE CLAIMS ───────────────────────────────────────────

CREATE POLICY "expenses_select"
  ON expense_claims FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = expense_claims.employee_id
        AND e.manager_id = auth_employee_id(company_id)
    )
  );

CREATE POLICY "expenses_insert_self"
  ON expense_claims FOR INSERT
  WITH CHECK (
    employee_id = auth_employee_id(company_id)
    OR is_hr_or_admin(company_id)
  );

CREATE POLICY "expenses_update"
  ON expense_claims FOR UPDATE
  USING (
    is_hr_or_admin(company_id)
    OR (employee_id = auth_employee_id(company_id) AND status = 'draft')
  );

-- ─── RECRUITMENT ──────────────────────────────────────────────

CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "jobs_modify" ON jobs FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "candidates_select" ON candidates FOR SELECT USING (is_hr_or_admin(company_id));
CREATE POLICY "candidates_modify" ON candidates FOR ALL USING (is_hr_or_admin(company_id));

CREATE POLICY "interviews_select" ON interviews FOR SELECT USING (is_hr_or_admin(company_id));
CREATE POLICY "interviews_modify" ON interviews FOR ALL USING (is_hr_or_admin(company_id));

-- ─── PERFORMANCE ──────────────────────────────────────────────

CREATE POLICY "perf_reviews_select"
  ON performance_reviews FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
    OR reviewer_id = auth_employee_id(company_id)
  );

CREATE POLICY "perf_reviews_modify"
  ON performance_reviews FOR ALL
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
    OR reviewer_id = auth_employee_id(company_id)
  );

CREATE POLICY "okrs_select" ON okrs FOR SELECT USING (company_id = ANY(auth_user_company_ids()));
CREATE POLICY "okrs_modify" ON okrs FOR ALL USING (
  is_hr_or_admin(company_id)
  OR owner_id = auth_employee_id(company_id)
);

-- ─── TRAINING ─────────────────────────────────────────────────

CREATE POLICY "enrollments_select"
  ON training_enrollments FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

CREATE POLICY "enrollments_modify"
  ON training_enrollments FOR ALL
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

-- ─── DOCUMENTS ────────────────────────────────────────────────

CREATE POLICY "documents_select"
  ON documents FOR SELECT
  USING (
    is_hr_or_admin(company_id)
    OR employee_id = auth_employee_id(company_id)
  );

CREATE POLICY "documents_modify"
  ON documents FOR ALL
  USING (
    is_hr_or_admin(company_id)
    OR (employee_id = auth_employee_id(company_id) AND NOT is_confidential)
  );

-- ─── NOTIFICATIONS ────────────────────────────────────────────

CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ─── AUDIT LOGS ───────────────────────────────────────────────

CREATE POLICY "audit_select_admin"
  ON audit_logs FOR SELECT
  USING (is_hr_or_admin(company_id) OR is_super_admin());

CREATE POLICY "audit_insert_all"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- System inserts from Edge Functions

-- ─── SERVICE ROLE BYPASSES ALL RLS ───────────────────────────
-- (Supabase service_role key used in Edge Functions automatically bypasses RLS)
