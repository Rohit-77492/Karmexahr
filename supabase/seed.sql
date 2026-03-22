-- ============================================================
-- KarmexaHR — Seed Data (Development Only)
-- Run: supabase db seed
-- ============================================================

-- ─── COMPANIES ────────────────────────────────────────────────

INSERT INTO companies (id, name, slug, industry, size_range, plan, max_employees, gst_number, pan_number, timezone) VALUES
  ('11111111-0000-0000-0000-000000000001', 'TechNova Solutions', 'technova', 'IT/Software', '201-500', 'enterprise', 500, '29AAFCT3518Q1ZH', 'AAFCT3518Q', 'Asia/Kolkata'),
  ('22222222-0000-0000-0000-000000000002', 'Apex Dynamics', 'apex', 'Manufacturing', '101-200', 'growth', 200, '27AAICA5553M1ZT', 'AAICA5553M', 'Asia/Kolkata'),
  ('33333333-0000-0000-0000-000000000003', 'BlueSky Ventures', 'bluesky', 'Finance', '51-100', 'starter', 100, '27AAGFB1682N1ZP', 'AAGFB1682N', 'Asia/Kolkata');

-- ─── DEPARTMENTS ──────────────────────────────────────────────

INSERT INTO departments (id, company_id, name, code) VALUES
  ('d1000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Engineering', 'ENG'),
  ('d2000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Sales & Marketing', 'SLS'),
  ('d3000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Human Resources', 'HR'),
  ('d4000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Finance', 'FIN'),
  ('d5000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Operations', 'OPS');

-- ─── DESIGNATIONS ─────────────────────────────────────────────

INSERT INTO designations (company_id, name, level, department_id) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Software Engineer',         3, 'd1000000-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000001', 'Senior Software Engineer',  4, 'd1000000-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000001', 'Engineering Manager',       5, 'd1000000-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000001', 'Sales Executive',           3, 'd2000000-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000001', 'HR Manager',                5, 'd3000000-0000-0000-0000-000000000003'),
  ('11111111-0000-0000-0000-000000000001', 'Finance Analyst',           3, 'd4000000-0000-0000-0000-000000000004');

-- ─── LEAVE POLICIES ───────────────────────────────────────────

INSERT INTO leave_policies (company_id, name, leave_type, days_per_year, carry_forward, max_carry_forward, requires_document, description) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Annual Leave',       'annual',    24, true,  10, false, '24 days per year, carry forward max 10 days'),
  ('11111111-0000-0000-0000-000000000001', 'Casual Leave',       'casual',    12, false,  0, false, '12 days per year, cannot be carried forward'),
  ('11111111-0000-0000-0000-000000000001', 'Sick Leave',         'sick',      12, false,  0, true,  'Medical certificate required for >3 consecutive days'),
  ('11111111-0000-0000-0000-000000000001', 'Maternity Leave',    'maternity', 182,false,  0, true,  '26 weeks as per Maternity Benefits Act', 'female'),
  ('11111111-0000-0000-0000-000000000001', 'Paternity Leave',    'paternity', 15, false,  0, false, '15 days for male employees'),
  ('11111111-0000-0000-0000-000000000001', 'Compensatory Off',   'comp_off',   0, false,  0, false, 'Earned for working on holidays/weekends'),
  ('11111111-0000-0000-0000-000000000001', 'Work From Home',     'wfh',       60, false,  0, false, 'Up to 60 WFH days per year');

-- ─── HOLIDAYS 2025 ────────────────────────────────────────────

INSERT INTO holidays (company_id, name, date, holiday_type) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Republic Day',          '2025-01-26', 'national'),
  ('11111111-0000-0000-0000-000000000001', 'Holi',                  '2025-03-14', 'festival'),
  ('11111111-0000-0000-0000-000000000001', 'Good Friday',           '2025-04-18', 'national'),
  ('11111111-0000-0000-0000-000000000001', 'Maharashtra Day',       '2025-05-01', 'national'),
  ('11111111-0000-0000-0000-000000000001', 'Independence Day',      '2025-08-15', 'national'),
  ('11111111-0000-0000-0000-000000000001', 'Gandhi Jayanti',        '2025-10-02', 'national'),
  ('11111111-0000-0000-0000-000000000001', 'Dussehra',              '2025-10-02', 'festival'),
  ('11111111-0000-0000-0000-000000000001', 'Diwali',                '2025-10-20', 'festival'),
  ('11111111-0000-0000-0000-000000000001', 'Diwali (Bhai Dooj)',    '2025-10-23', 'festival'),
  ('11111111-0000-0000-0000-000000000001', 'Christmas',             '2025-12-25', 'national'),
  ('11111111-0000-0000-0000-000000000001', 'Company Anniversary',   '2025-03-28', 'company'),
  ('11111111-0000-0000-0000-000000000001', 'Founders Day',          '2025-06-15', 'company');

-- ─── SALARY STRUCTURES ───────────────────────────────────────

INSERT INTO salary_structures (company_id, name, basic_percent, components) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Standard CTC', 40, '[
    {"name":"Basic","type":"earning","calc_type":"percent","value":40,"is_taxable":true},
    {"name":"HRA","type":"earning","calc_type":"percent","value":20,"is_taxable":false},
    {"name":"Special Allowance","type":"earning","calc_type":"remainder","value":0,"is_taxable":true},
    {"name":"PF (Employee)","type":"deduction","calc_type":"percent_of_basic","value":12,"is_statutory":true},
    {"name":"ESI (Employee)","type":"deduction","calc_type":"percent","value":0.75,"is_statutory":true},
    {"name":"Professional Tax","type":"deduction","calc_type":"slab","value":0,"is_statutory":true}
  ]');
