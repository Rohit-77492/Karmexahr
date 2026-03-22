'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import {
  User, Clock, CalendarMinus, Banknote, FileText,
  CreditCard, Phone, MapPin, Edit2, Save, X,
} from 'lucide-react'
import { formatINR, formatDate, getAvatarColor, maskAccountNumber } from '@/lib/utils'
import LeaveBalanceWidget from '@/components/leaves/LeaveBalanceWidget'

const SELF_TABS = [
  { id: 'profile',   label: 'My Profile',   icon: User },
  { id: 'leaves',    label: 'Leave Balance', icon: CalendarMinus },
  { id: 'payslips',  label: 'Payslips',      icon: Banknote },
  { id: 'documents', label: 'Documents',     icon: FileText },
]

export default function SelfServicePage() {
  const params   = useParams()
  const supabase = createClient()
  const [tab, setTab]         = useState('profile')
  const [employee, setEmployee] = useState<any>(null)
  const [payslips, setPayslips] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  useEffect(() => {
    const init = async () => {
      const { data: company } = await supabase.from('companies').select('id').eq('slug', params.company as string).single()
      if (!company) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: emp } = await supabase.from('employees')
        .select('*, departments(name), designations(name), manager:employees!manager_id(first_name, last_name)')
        .eq('company_id', company.id).eq('user_id', user.id).single()

      if (emp) {
        setEmployee(emp)
        setEditForm({ phone: emp.phone, current_address: emp.current_address, emergency_contact: emp.emergency_contact })
      }

      // Load payslips
      if (emp) {
        const { data: slips } = await supabase.from('payslips')
          .select('*').eq('employee_id', emp.id).eq('is_published', true)
          .order('year', { ascending: false }).order('month', { ascending: false }).limit(24)
        setPayslips(slips ?? [])

        const { data: docs } = await supabase.from('documents')
          .select('*').eq('employee_id', emp.id).order('created_at', { ascending: false })
        setDocuments(docs ?? [])
      }
      setLoading(false)
    }
    init()
  }, [params.company])

  const handleSave = async () => {
    if (!employee) return
    const { error } = await supabase.from('employees').update({
      phone:             editForm.phone,
      current_address:   editForm.current_address,
      emergency_contact: editForm.emergency_contact,
    }).eq('id', employee.id)
    if (!error) {
      setEmployee((e: any) => ({ ...e, ...editForm }))
      setEditing(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading your profile...</div>
  if (!employee) return <div className="p-6 text-muted-foreground text-sm">Employee record not found. Please contact HR.</div>

  const avatarColor = getAvatarColor(`${employee.first_name} ${employee.last_name}`)
  const initials    = `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase()
  const dept        = employee.departments?.name
  const desig       = employee.designations?.name
  const mgr         = employee.manager

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1"

  return (
    <div className="p-6 max-w-[1000px] mx-auto animate-fade-in">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-card to-muted/30 border border-border rounded-2xl p-6 mb-6 flex flex-wrap gap-5 items-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)` }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{desig ?? 'Employee'} · {dept ?? 'General'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="font-mono">{employee.employee_code}</span>
            <span>Joined {employee.join_date ? formatDate(employee.join_date, 'dd MMM yyyy') : '—'}</span>
            {mgr && <span>Reports to {mgr.first_name} {mgr.last_name}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full capitalize ${
          employee.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
        }`}>{employee.status.replace(/_/g,' ')}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 mb-5 overflow-x-auto">
        {SELF_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── PROFILE ─── */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Personal */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gold-500" />
                <span className="font-display font-bold text-sm">Personal Details</span>
              </div>
              <button onClick={() => setEditing(!editing)}
                className="flex items-center gap-1 text-xs text-gold-500 font-medium hover:text-gold-400">
                {editing ? <X size={12} /> : <Edit2 size={12} />}
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Phone</label>
                  <input className={inp} value={editForm.phone ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Current Address</label>
                  <textarea className={inp} rows={3} value={typeof editForm.current_address === 'string' ? editForm.current_address : JSON.stringify(editForm.current_address)}
                    onChange={e => setEditForm((f: any) => ({ ...f, current_address: e.target.value }))} />
                </div>
                <button onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold hover:opacity-90">
                  <Save size={12} /> Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Full Name',    `${employee.first_name} ${employee.last_name}`],
                  ['Work Email',   employee.email],
                  ['Phone',        employee.phone ?? '—'],
                  ['Date of Birth', employee.date_of_birth ? formatDate(employee.date_of_birth, 'dd MMM yyyy') : '—'],
                  ['Gender',       employee.gender ?? '—'],
                  ['Blood Group',  employee.blood_group ?? '—'],
                  ['Nationality',  employee.nationality ?? 'Indian'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
                    <span className="text-xs font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employment */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Employment & Payroll</span>
            </div>
            <div className="space-y-3">
              {[
                ['Department',   dept ?? '—'],
                ['Designation',  desig ?? '—'],
                ['Type',         (employee.employment_type ?? 'full_time').replace(/_/g,' ')],
                ['Work Location',employee.work_location ?? 'Office'],
                ['PAN',          employee.pan_number ? `${employee.pan_number.slice(0,3)}***${employee.pan_number.slice(-2)}` : '—'],
                ['UAN (PF)',     employee.uan_number ?? '—'],
                ['Bank',         employee.bank_name ?? '—'],
                ['Account',      employee.bank_account_number ? maskAccountNumber(employee.bank_account_number) : '—'],
                ['IFSC',         employee.bank_ifsc ?? '—'],
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
              <Phone size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Emergency Contact</span>
            </div>
            {employee.emergency_contact && Object.keys(employee.emergency_contact as object).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(employee.emergency_contact as object).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-24 flex-shrink-0 capitalize">{k.replace(/_/g,' ')}</span>
                    <span className="text-xs font-medium text-foreground">{v as string}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No emergency contact on file. Contact HR to update.</p>
            )}
          </div>

          {/* Address */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-gold-500" />
              <span className="font-display font-bold text-sm">Addresses</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Current Address</div>
                <p className="text-xs text-foreground leading-relaxed">
                  {typeof employee.current_address === 'object' && employee.current_address
                    ? Object.values(employee.current_address as object).filter(Boolean).join(', ')
                    : employee.current_address || 'Not provided'}
                </p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Permanent Address</div>
                <p className="text-xs text-foreground leading-relaxed">
                  {typeof employee.permanent_address === 'object' && employee.permanent_address
                    ? Object.values(employee.permanent_address as object).filter(Boolean).join(', ')
                    : employee.permanent_address || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEAVE BALANCE ─── */}
      {tab === 'leaves' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="font-display font-bold text-sm mb-4">Leave Balances — {new Date().getFullYear()}</div>
            <LeaveBalanceWidget employeeId={employee.id} />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="font-display font-bold text-sm mb-4">Recent Leave Requests</div>
            <RecentLeaves employeeId={employee.id} />
          </div>
        </div>
      )}

      {/* ─── PAYSLIPS ─── */}
      {tab === 'payslips' && (
        <div className="space-y-3">
          {payslips.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Banknote size={32} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No payslips published yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {payslips.map(ps => (
                <div key={ps.id} className="bg-card border border-border rounded-2xl p-4 hover:border-border/70 transition-colors group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                      <Banknote size={16} className="text-gold-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">{MONTHS[ps.month - 1]} {ps.year}</div>
                      <div className="text-[10px] text-muted-foreground">{ps.present_days}/{ps.working_days} days</div>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Gross</span>
                      <span className="font-medium">{formatINR(ps.gross_earnings)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Deductions</span>
                      <span className="text-destructive">-{formatINR(ps.total_deductions)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-foreground">Net Pay</span>
                      <span className="text-green-500">{formatINR(ps.net_pay)}</span>
                    </div>
                  </div>
                  <button className="w-full text-xs text-gold-500 font-semibold hover:text-gold-400 flex items-center justify-center gap-1.5 py-1.5 border border-gold-500/20 rounded-lg hover:bg-gold-500/5 transition-colors">
                    <FileText size={11} /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DOCUMENTS ─── */}
      {tab === 'documents' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {documents.length === 0 ? (
            <div className="col-span-3 bg-card border border-border rounded-2xl p-12 text-center">
              <FileText size={32} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No documents uploaded</p>
            </div>
          ) : documents.map(doc => (
            <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:border-border/70 transition-colors group">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-xs font-semibold text-foreground truncate mb-1">{doc.title}</div>
              <div className="text-[10px] text-muted-foreground">{formatDate(doc.created_at, 'dd MMM yyyy')}</div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-gold-500 hover:underline mt-2 block">View →</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Mini component for recent leaves
function RecentLeaves({ employeeId }: { employeeId: string }) {
  const supabase = createClient()
  const [leaves, setLeaves] = useState<any[]>([])

  useEffect(() => {
    supabase.from('leave_requests').select('*, leave_policies(name)')
      .eq('employee_id', employeeId).order('applied_on', { ascending: false }).limit(5)
      .then(({ data }) => setLeaves(data ?? []))
  }, [employeeId])

  if (leaves.length === 0) return <p className="text-xs text-muted-foreground">No recent requests</p>

  return (
    <div className="space-y-2">
      {leaves.map(lv => (
        <div key={lv.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground">{lv.leave_policies?.name ?? lv.leave_type}</div>
            <div className="text-[10px] text-muted-foreground">{formatDate(lv.from_date, 'dd MMM')} — {formatDate(lv.to_date, 'dd MMM')} · {lv.days}d</div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
            lv.status === 'approved' ? 'bg-green-500/10 text-green-500' :
            lv.status === 'pending'  ? 'bg-gold-500/10 text-gold-500' :
            'bg-destructive/10 text-destructive'
          }`}>{lv.status}</span>
        </div>
      ))}
    </div>
  )
}
