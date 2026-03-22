// ============================================================
// KarmexaHR — Supabase Database Types
// Auto-generate with: npm run db:generate-types
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'notice_period'
export type LeaveType = 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity' | 'comp_off' | 'lwp' | 'wfh'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'revoked'
export type AttendanceType = 'present' | 'absent' | 'wfh' | 'half_day' | 'on_duty' | 'holiday' | 'weekend'
export type PayrollStatus = 'draft' | 'processing' | 'processed' | 'paid' | 'failed'
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'cancelled'
export type CandidateStage = 'applied' | 'screened' | 'interview_1' | 'interview_2' | 'interview_3' | 'offer' | 'hired' | 'rejected'
export type UserRole = 'super_admin' | 'admin' | 'hr_manager' | 'manager' | 'employee'
export type PlanType = 'free' | 'starter' | 'growth' | 'enterprise'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'consultant'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  industry: string | null
  size_range: string | null
  gst_number: string | null
  pan_number: string | null
  cin_number: string | null
  registered_address: Json
  plan: PlanType
  plan_expires_at: string | null
  max_employees: number
  fiscal_year_start: number
  work_week: string[]
  timezone: string
  currency: string
  settings: Json
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  is_active: boolean
  last_seen_at: string | null
  preferences: Json
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  company_id: string
  user_id: string | null
  employee_code: string
  first_name: string
  last_name: string
  email: string
  personal_email: string | null
  phone: string | null
  date_of_birth: string | null
  gender: Gender | null
  blood_group: string | null
  nationality: string
  department_id: string | null
  designation_id: string | null
  employment_type: EmploymentType
  manager_id: string | null
  status: EmployeeStatus
  join_date: string
  confirmation_date: string | null
  exit_date: string | null
  notice_period_days: number
  work_location: string
  office_location: string | null
  pan_number: string | null
  aadhaar_number: string | null
  uan_number: string | null
  esic_number: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_account_type: string
  emergency_contact: Json
  current_address: Json
  permanent_address: Json
  custom_fields: Json
  avatar_url: string | null
  created_at: string
  updated_at: string
  // Joins
  departments?: { name: string }
  designations?: { name: string }
  manager?: { first_name: string; last_name: string }
}

export interface Payslip {
  id: string
  company_id: string
  run_id: string
  employee_id: string
  month: number
  year: number
  working_days: number
  present_days: number
  lop_days: number
  basic: number
  hra: number
  special_allowance: number
  conveyance: number
  medical_allowance: number
  other_earnings: Json
  gross_earnings: number
  pf_employee: number
  pf_employer: number
  esi_employee: number
  esi_employer: number
  professional_tax: number
  income_tax_tds: number
  loan_deduction: number
  advance_deduction: number
  other_deductions: Json
  total_deductions: number
  net_pay: number
  ytd_gross: number
  ytd_tds: number
  is_published: boolean
  published_at: string | null
  pdf_url: string | null
  created_at: string
  employees?: Pick<Employee, 'first_name' | 'last_name' | 'employee_code' | 'pan_number' | 'uan_number'>
}

export interface LeaveRequest {
  id: string
  company_id: string
  employee_id: string
  policy_id: string
  leave_type: LeaveType
  from_date: string
  to_date: string
  days: number
  reason: string | null
  attachment_url: string | null
  status: LeaveStatus
  applied_on: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
  employees?: Pick<Employee, 'first_name' | 'last_name' | 'employee_code' | 'department_id'>
  leave_policies?: { name: string }
}

export interface AttendanceRecord {
  id: string
  company_id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  total_hours: number | null
  overtime_hours: number
  type: AttendanceType
  source: string
  location: Json | null
  notes: string | null
  is_regularized: boolean
  created_at: string
  updated_at: string
}

export interface PayrollRun {
  id: string
  company_id: string
  month: number
  year: number
  status: PayrollStatus
  total_employees: number
  total_gross: number
  total_deductions: number
  total_net: number
  processed_at: string | null
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  remarks: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  company_id: string
  department_id: string | null
  title: string
  description: string | null
  requirements: string | null
  location: string | null
  employment_type: EmploymentType
  experience_min: number
  experience_max: number | null
  salary_min: number | null
  salary_max: number | null
  openings: number
  status: JobStatus
  deadline: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  departments?: { name: string }
}

export interface Candidate {
  id: string
  company_id: string
  job_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  current_company: string | null
  current_designation: string | null
  experience_years: number | null
  current_ctc: number | null
  expected_ctc: number | null
  notice_period: number | null
  resume_url: string | null
  stage: CandidateStage
  score: number | null
  tags: string[]
  source: string
  notes: string | null
  is_blacklisted: boolean
  applied_at: string
  created_at: string
  updated_at: string
  jobs?: Pick<Job, 'title'>
}

export interface PerformanceReview {
  id: string
  company_id: string
  cycle_id: string
  employee_id: string
  reviewer_id: string | null
  self_rating: number | null
  manager_rating: number | null
  overall_rating: number | null
  goals: Json
  competencies: Json
  strengths: string | null
  improvements: string | null
  comments: string | null
  status: string
  submitted_at: string | null
  completed_at: string | null
  created_at: string
  employees?: Pick<Employee, 'first_name' | 'last_name' | 'employee_code'>
}

export interface TrainingCourse {
  id: string
  company_id: string
  title: string
  description: string | null
  category: string | null
  difficulty: string
  duration_hours: number | null
  instructor: string | null
  content_url: string | null
  thumbnail_url: string | null
  is_mandatory: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  enrollments?: { count: number }[]
}

export interface Notification {
  id: string
  user_id: string
  company_id: string | null
  type: string
  title: string
  body: string | null
  data: Json
  is_read: boolean
  read_at: string | null
  created_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Dashboard stats
export interface DashboardStats {
  totalEmployees: number
  presentToday: number
  onLeave: number
  openPositions: number
  monthlyPayroll: number
  avgPerformance: number
  pendingLeaves: number
  pendingExpenses: number
}
