'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Briefcase,
  CreditCard, FileText, Clock, Award, TrendingUp, ChevronRight,
  Shield, Download, Send, AlertCircle, CheckCircle, User,
} from 'lucide-react'
import { formatINR, formatINRCompact, getAvatarColor, formatDate } from '@/lib/utils'
import type { Employee, Payslip, LeaveRequest, AttendanceRecord } from '@/lib/supabase/database.types'

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'attendance',  label: 'Attendance' },
  { id: 'payslips',    label: 'Payslips' },
  { id: 'leaves',      label: 'Leaves' },
  { id: 'documents',   label: 'Documents' },
  { id: 'performance', label: 'Performance' },
  { id: 'salary',      label: 'Salary' },
]

const STATUS_COLORS: Record<string, string> = {
  active:          'bg-green-500/10 text-green-500',
  on_leave:        'bg-gold-500/10 text-gold-500',
  inactive:        'bg-muted text-muted-foreground',
  terminated:      'bg-destructive/10 text-destructive',
  notice_period:   'bg-orange-500/10 text-orange-500',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function EmployeeProfilePage() {
  const params   = useParams()
  const router   = useRouter()
  const supabase = createClient()

  const [employee, setEmployee]     = useState<Employee | null>(null)
  const [salary, setSalary]         = useState<any>(null)
  const [payslips, setPayslips]     = useState<Payslip[]>([])
  const [leaves, setLeaves]         = useState<LeaveRequest[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [documents, setDocuments]   = useState<any[]>([])
  const [reviews, setReviews]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('overview')
  const [editing, setEditing]       = useState(false)
  const [editForm, setEditForm]     = useState<Partial<Employee>>({})

  useEffect(() => {
    const load = async () => {
      const empId     = params.id as string
      const company   = params.company as string

      const { data: emp } = await supabase.from('employees')
        .select(`
          *,
          departments(id, name),
          designations(id, name),
          manager:employees!manager_id(id, first_name, last_name, designations(name))
        `)
        .eq('id', empId).single()

      if (!emp) { toast.error('Employee not found'); router.back(); return }
      setEmployee(emp as any)
      setEditForm(emp as any)

      // Parallel load
      const [
        { data: sal },
        { data: slips },
        { data: lvs },
        { data: att },
        { data: docs },
        { data: rev },
      ] = await Promise.all([
        supabase.from('employee_salaries').select('*, salary_structures(name)').eq('employee_id', empId).eq('is_current', true).single(),
        supabase.from('payslips').select('*').eq('employee_id', empId).eq('is_published', true).order('year', { ascending: false }).order('month', { ascending: false }).limit(12),
        supabase.from('leave_requests').select('*, leave_policies(name)').eq('employee_id', empId).order('applied_on', { ascending: false }).limit(20),
        supabase.from('attendance').select('*').eq('employee_id', empId)
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase.from('documents').select('*').eq('employee_id', empId).order('created_at', { ascending: false }),
        supabase.from('performance_reviews').select('*, review_cycles(name, cycle_type)').eq('employee_id', empId).order('created_at', { ascending: false }).limit(5),
      ])

      setSalary(sal)
      setPayslips((slips ?? []) as Payslip[])
      setLeaves((lvs ?? []) as any)
      setAttendance((att ?? []) as any)
      setDocuments(docs ?? [])
      setReviews(rev ?? [])
      setLoading(false)
    }
    load()
  }, [params.id])

  const handleSave = async () => {
    if (!employee) return
    const { error } = await supabase.from('employees').update({
      first_name:   editForm.first_name,
      last_name:    editForm.last_name,
      phone:        editForm.phone,
      work_location: editForm.work_location,
      date_of_birth: editForm.date_of_birth,
      gender:       editForm.gender,
    }).eq('id', employee.id)

    if (error) toast.error(error.message)
    else {
      toast.success('Profile updated')
      setEmployee(prev => prev ? { ...prev, ...editForm } : prev)
      setEditing(false)
    }
  }

  const handleTerminate = async () => {
    if (!employee) return
    if (!confirm(`Terminate ${employee.first_name} ${employee.last_name}? This action cannot be undone.`)) return
    const { error } = await supabase.from('employees').update({
      status: 'terminated',
      exit_date: new Date().toISOString().split('T')[0],
    }).eq('id', employee.id)
    if (!error) { toast.success('Employee terminated'); setEmployee(prev => prev ? { ...prev, status: 'terminated' } : prev) }
  }

  if (loading) return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="bg-card border border-border rounded-2xl p-6 h-48" />
      </div>
    </div>
  )

  if (!employee) return null

  const avatarColor   = getAvatarColor(`${employee.first_name} ${employee.last_name}`)
  const initials      = `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase()
  const dept          = (employee as any).departments
  const desig         = (employee as any).designations
  const mgr           = (employee as any).manager

  const monthPresent  = attendance.filter(a => ['present','wfh','on_duty'].includes(a.type)).length
  const monthAbsent   = attendance.filter(a => a.type === 'absent').length
  const totalHours    = attendance.reduce((s, a) => s + (a.total_hours ?? 0), 0)

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 group">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Employees
      </button>

      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <div className="flex flex-wrap gap-5 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)` }}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[employee.status]}`}>
                {employee.status.replace(/_/g,' ')}
              </span>
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">{employee.employee_code}</span>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {desig?.name ?? 'Employee'} · {dept?.name ?? 'General'}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Mail,      text: employee.email },
                { icon: Phone,     text: employee.phone ?? 'Not set' },
                { icon: MapPin,    text: employee.work_location ?? 'Office' },
                { icon: Calendar,  text: employee.join_date ? `Joined ${formatDate(employee.join_date, 'dd MMM yyyy')}` : 'No date' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon size={12} className="flex-shrink-0" />
                  <span className="truncate">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => { setEditing(!editing) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
              <Edit size={12} /> {editing ? 'Cancel' : 'Edit'}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
              <Send size={12} /> Message
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold hover:opacity-90 shadow-md shadow-gold-500/20">
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={lbl}>First Name</label>
                <input className={inp} value={editForm.first_name ?? ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Last Name</label>
                <input className={inp} value={editForm.last_name ?? ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input className={inp} value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Work Location</label>
                <select className={inp} value={editForm.work_location ?? 'office'} onChange={e => setEditForm(f => ({ ...f, work_location: e.target.value }))}>
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold hover:opacity-90">
                Save Changes
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted">
                Cancel
              </button>
              {employee.status !== 'terminated' && (
                <button onClick={handleTerminate} className="ml-auto px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 border border-destructive/20">
                  Terminate Employee
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Monthly Present', value: monthPresent, color: '#22d07a', icon: CheckCircle },
          { label: 'Absent',          value: monthAbsent,  color: '#ff5a65', icon: AlertCircle },
          { label: 'Hours Logged',    value: `${totalHours.toFixed(0)}h`, color: '#4d9fff', icon: Clock },
          { label: 'Current CTC',     value: salary ? formatINRCompact(salary.ctc) : '—', color: '#f0a500', icon: CreditCard },
          { label: 'YoE',
            value: employee.join_date ? `${((Date.now() - new Date(employee.join_date).getTime()) / (1000*60*60*24*365.25)).toFixed(1)}y` : '—',
            color: '#9b6dff', icon: Award },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15`, color: s.color }}>
              <s.icon size={15} />
            </div>
            <div>
              <div className="font-display font-extrabold text-xl text-foreground leading-none">{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 mb-5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Personal info */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Personal Information</span>
            </div>
            <div className="space-y-3">
              {[
                ['Full Name',         `${employee.first_name} ${employee.last_name}`],
                ['Email',             employee.email],
                ['Phone',             employee.phone ?? '—'],
                ['Date of Birth',     employee.date_of_birth ? formatDate(employee.date_of_birth, 'dd MMM yyyy') : '—'],
                ['Gender',            employee.gender ?? '—'],
                ['Blood Group',       employee.blood_group ?? '—'],
                ['Nationality',       employee.nationality ?? 'Indian'],
                ['PAN Number',        employee.pan_number ? `${employee.pan_number.slice(0,2)}***${employee.pan_number.slice(-2)}` : '—'],
                ['Aadhaar',           employee.aadhaar_number ? `XXXX XXXX ${employee.aadhaar_number.slice(-4)}` : '—'],
                ['UAN (PF)',          employee.uan_number ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
                  <span className="text-xs font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employment info */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Employment Details</span>
            </div>
            <div className="space-y-3">
              {[
                ['Department',      dept?.name ?? '—'],
                ['Designation',     desig?.name ?? '—'],
                ['Employment Type', (employee.employment_type ?? '').replace(/_/g,' ')],
                ['Reporting To',    mgr ? `${mgr.first_name} ${mgr.last_name}` : 'None'],
                ['Manager Title',   (mgr as any)?.designations?.name ?? '—'],
                ['Work Location',   employee.work_location ?? 'Office'],
                ['Join Date',       employee.join_date ? formatDate(employee.join_date, 'dd MMM yyyy') : '—'],
                ['Confirmation',    employee.confirmation_date ? formatDate(employee.confirmation_date, 'dd MMM yyyy') : 'Pending'],
                ['Notice Period',   `${employee.notice_period_days ?? 30} days`],
                ['Status',          employee.status.replace(/_/g,' ')],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
                  <span className="text-xs font-medium text-foreground capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bank details */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Bank Details</span>
              <span className="text-[9px] bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded-full ml-auto">Encrypted</span>
            </div>
            <div className="space-y-3">
              {[
                ['Bank Name',    employee.bank_name ?? '—'],
                ['Account No.',  employee.bank_account_number ? `XXXX${employee.bank_account_number.slice(-4)}` : '—'],
                ['IFSC Code',    employee.bank_ifsc ?? '—'],
                ['Account Type', employee.bank_account_type ?? 'Savings'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
                  <span className="text-xs font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency contact */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Emergency Contact</span>
            </div>
            {employee.emergency_contact && Object.keys(employee.emergency_contact as object).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(employee.emergency_contact as object).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0 capitalize">{k.replace(/_/g,' ')}</span>
                    <span className="text-xs font-medium text-foreground">{v as string}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No emergency contact on file</p>
            )}
          </div>
        </div>
      )}

      {/* ─── ATTENDANCE ─── */}
      {activeTab === 'attendance' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="font-display font-bold text-sm">Attendance — {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</span>
          </div>
          {attendance.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No attendance records this month</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Date','Day','Clock In','Clock Out','Hours','Type'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => {
                  const d    = new Date(a.date)
                  const dow  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
                  const typeColor: Record<string, string> = {
                    present: 'text-green-500', wfh: 'text-blue-400', absent: 'text-destructive',
                    half_day: 'text-gold-500', on_duty: 'text-teal-400',
                  }
                  return (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-xs text-foreground font-medium">{formatDate(a.date, 'dd MMM')}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{dow}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{a.clock_in ? new Date(a.clock_in).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{a.total_hours ? `${a.total_hours}h` : '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold capitalize ${typeColor[a.type] ?? 'text-muted-foreground'}`}>{a.type.replace(/_/g,' ')}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── PAYSLIPS ─── */}
      {activeTab === 'payslips' && (
        <div className="space-y-3">
          {payslips.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">No payslips published yet</div>
          ) : payslips.map(ps => (
            <div key={ps.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-border/70 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-gold-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-foreground">{MONTHS[ps.month - 1]} {ps.year} Payslip</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Gross: {formatINR(ps.gross_earnings)} · Net: <span className="text-green-500 font-semibold">{formatINR(ps.net_pay)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Working Days</div>
                <div className="text-sm font-bold text-foreground">{ps.present_days}/{ps.working_days}</div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted/50">
                <Download size={12} /> PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── LEAVES ─── */}
      {activeTab === 'leaves' && (
        <div className="space-y-3">
          {leaves.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">No leave requests found</div>
          ) : leaves.map(lv => {
            const policy = (lv as any).leave_policies
            const sc = { pending: 'bg-gold-500/10 text-gold-500', approved: 'bg-green-500/10 text-green-500', rejected: 'bg-destructive/10 text-destructive', cancelled: 'bg-muted text-muted-foreground' }
            return (
              <div key={lv.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">{policy?.name ?? lv.leave_type}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc[lv.status] ?? sc.pending}`}>{lv.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(lv.from_date, 'dd MMM yyyy')} — {formatDate(lv.to_date, 'dd MMM yyyy')} · {lv.days} day{lv.days !== 1 ? 's' : ''}
                  </div>
                  {lv.reason && <div className="text-xs text-muted-foreground/60 mt-1 truncate">{lv.reason}</div>}
                </div>
                <div className="text-right text-xs text-muted-foreground">{formatDate(lv.applied_on, 'dd MMM yyyy')}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── DOCUMENTS ─── */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {documents.length === 0 ? (
            <div className="col-span-3 bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">No documents uploaded</div>
          ) : documents.map(doc => (
            <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:border-border/70 transition-colors group">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-xs font-semibold text-foreground truncate">{doc.title}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{formatDate(doc.created_at, 'dd MMM yyyy')}</div>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">View</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── PERFORMANCE ─── */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">No performance reviews yet</div>
          ) : reviews.map(r => {
            const cycle = (r as any).review_cycles
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-sm text-foreground">{cycle?.name ?? 'Review'}</div>
                    <div className="text-xs text-muted-foreground capitalize">{cycle?.cycle_type} review</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-gold-500/10 text-gold-500'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ['Self Rating',    r.self_rating],
                    ['Manager Rating', r.manager_rating],
                    ['Overall',        r.overall_rating],
                  ].map(([label, val]) => (
                    <div key={label as string} className="text-center">
                      <div className="font-display font-extrabold text-2xl text-foreground">{val ?? '—'}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                {r.strengths && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Strengths</div>
                    <p className="text-xs text-foreground">{r.strengths}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── SALARY ─── */}
      {activeTab === 'salary' && (
        <div className="space-y-4">
          {!salary ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <CreditCard size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No salary structure assigned</p>
              <button className="mt-3 px-4 py-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold rounded-xl hover:opacity-90">
                Assign Salary Structure
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-gold-500/10 to-orange-500/5 border border-gold-500/20 rounded-2xl p-6">
                <div className="text-xs text-muted-foreground mb-1">Annual CTC</div>
                <div className="font-display font-extrabold text-4xl text-foreground mb-1">{formatINR(salary.ctc)}</div>
                <div className="text-sm text-muted-foreground">
                  {formatINRCompact(salary.ctc / 12)}/month gross · Effective {salary.effective_from ? formatDate(salary.effective_from, 'dd MMM yyyy') : '—'}
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">{(salary.salary_structures as any)?.name ?? 'Custom Structure'}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="font-semibold text-sm mb-3 text-green-500">Monthly Earnings</div>
                  {[
                    ['Basic',            Math.round(salary.ctc / 12 * (salary.basic_percent / 100))],
                    ['HRA (20%)',        Math.round(salary.ctc / 12 * 0.20)],
                    ['Special Allow.',   Math.round(salary.ctc / 12 * 0.35)],
                    ['Conveyance',       1600],
                    ['Medical Allow.',   1250],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{formatINR(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 text-xs font-bold text-green-500 mt-1">
                    <span>Gross</span>
                    <span>{formatINR(Math.round(salary.ctc / 12))}</span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="font-semibold text-sm mb-3 text-destructive">Monthly Deductions</div>
                  {[
                    ['PF (Employee 12%)',  Math.min(Math.round(salary.ctc / 12 * 0.40), 15000) * 0.12],
                    ['ESI (0.75%)',        0],
                    ['Professional Tax',  200],
                    ['Income Tax (TDS)',   Math.round(salary.ctc * 0.05 / 12)],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-destructive">-{formatINR(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 text-xs font-bold text-green-500 mt-1">
                    <span>Est. Net Take-Home</span>
                    <span>{formatINRCompact(Math.round(salary.ctc / 12 * 0.78))}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
