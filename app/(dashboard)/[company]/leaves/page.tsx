'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Check, X, Calendar, Clock, User, Download } from 'lucide-react'
import type { LeaveRequest } from '@/lib/supabase/database.types'
import { formatDistanceToNow } from 'date-fns'

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: 'Casual', sick: 'Sick', annual: 'Annual', maternity: 'Maternity',
  paternity: 'Paternity', comp_off: 'Comp Off', lwp: 'LWP', wfh: 'WFH',
}

const TABS = ['Pending', 'Approved', 'Rejected', 'All']

const LEAVE_COLORS: Record<string, string> = {
  casual: 'bg-blue-500/10 text-blue-400', sick: 'bg-red-500/10 text-destructive',
  annual: 'bg-gold-500/10 text-gold-500', maternity: 'bg-purple-500/10 text-purple-400',
  paternity: 'bg-teal-500/10 text-teal-400', wfh: 'bg-green-500/10 text-green-500',
  comp_off: 'bg-orange-500/10 text-orange-400', lwp: 'bg-muted text-muted-foreground',
}

export default function LeavesPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId] = useState('')
  const [tab, setTab]             = useState('Pending')
  const [requests, setRequests]   = useState<LeaveRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  const fetchRequests = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    let q = supabase.from('leave_requests')
      .select(`*, employees(first_name, last_name, employee_code, departments(name)), leave_policies(name)`)
      .eq('company_id', companyId)
      .order('applied_on', { ascending: false })

    if (tab === 'Pending') q = q.eq('status', 'pending')
    else if (tab === 'Approved') q = q.eq('status', 'approved')
    else if (tab === 'Rejected') q = q.in('status', ['rejected', 'revoked'])

    const { data } = await q
    setRequests((data ?? []) as any)
    setLoading(false)
  }, [companyId, tab])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async (id: string, action: 'approved' | 'rejected', note?: string) => {
    setProcessingId(id)
    const { error } = await supabase.from('leave_requests').update({
      status: action,
      reviewed_at: new Date().toISOString(),
      review_note: note ?? '',
    }).eq('id', id)

    if (error) { toast.error(error.message) }
    else {
      toast.success(`Leave ${action}`)
      fetchRequests()
    }
    setProcessingId(null)
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'Pending' && pendingCount > 0
              ? `${pendingCount} requests awaiting approval`
              : 'Manage employee leaves and policies'}
          </p>
        </div>
        <button
          onClick={() => setShowApply(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20"
        >
          <Plus size={13} /> Apply Leave
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 w-fit mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-32" />
                  <div className="h-2 bg-muted rounded w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Calendar size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No {tab.toLowerCase()} leave requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const emp = (req as any).employees
            const policy = (req as any).leave_policies
            const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??'
            const isProcessing = processingId === req.id

            return (
              <div key={req.id} className={`bg-card border border-border rounded-2xl p-5 hover:border-border/80 transition-colors ${req.status === 'pending' ? 'border-l-2 border-l-gold-500/50' : ''}`}>
                <div className="flex flex-wrap gap-4 items-start">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/80 to-teal-500/80 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground">{emp?.first_name} {emp?.last_name}</div>
                      <div className="text-xs text-muted-foreground">{emp?.employee_code} · {(emp?.departments as any)?.name}</div>
                    </div>
                  </div>

                  {/* Leave details */}
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${LEAVE_COLORS[req.leave_type] ?? 'bg-muted text-muted-foreground'}`}>
                      {LEAVE_TYPE_LABELS[req.leave_type]}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={11} />
                      {new Date(req.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {req.from_date !== req.to_date && (
                        <> — {new Date(req.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</>
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg">
                      {req.days}d
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(req.applied_on), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Status or actions */}
                  <div className="flex items-center gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleAction(req.id, 'rejected')}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50"
                        >
                          <X size={11} /> Reject
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'approved')}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-500 text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          <Check size={11} /> Approve
                        </button>
                      </>
                    ) : (
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        req.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                        req.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason */}
                {req.reason && (
                  <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/60">Reason: </span>{req.reason}
                  </div>
                )}
                {req.review_note && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/60">Note: </span>{req.review_note}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showApply && <ApplyLeaveModal companyId={companyId} onClose={() => setShowApply(false)} onSuccess={() => { setShowApply(false); fetchRequests() }} />}
    </div>
  )
}

function ApplyLeaveModal({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [policies, setPolicies] = useState<any[]>([])
  const [form, setForm] = useState({ policy_id: '', from_date: '', to_date: '', reason: '' })

  useEffect(() => {
    supabase.from('leave_policies').select('*').eq('company_id', companyId).eq('is_active', true)
      .then(({ data }) => setPolicies(data ?? []))
  }, [companyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.policy_id || !form.from_date || !form.to_date) { toast.error('Please fill all fields'); return }
    setLoading(true)

    const from = new Date(form.from_date)
    const to = new Date(form.to_date)
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000*60*60*24)) + 1
    const policy = policies.find(p => p.id === form.policy_id)

    const { data: emp } = await supabase.from('employees').select('id, company_id')
      .eq('company_id', companyId).single()

    if (!emp) { toast.error('Employee record not found'); setLoading(false); return }

    const { error } = await supabase.from('leave_requests').insert({
      company_id: companyId,
      employee_id: emp.id,
      policy_id: form.policy_id,
      leave_type: policy?.leave_type,
      from_date: form.from_date,
      to_date: form.to_date,
      days,
      reason: form.reason,
      status: 'pending',
    })

    if (error) { toast.error(error.message) } else { toast.success('Leave applied successfully'); onSuccess() }
    setLoading(false)
  }

  const inputCls = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const labelCls = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-display font-bold text-lg">Apply for Leave</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Leave Type</label>
            <select className={inputCls} value={form.policy_id} onChange={e => setForm(f => ({ ...f, policy_id: e.target.value }))} required>
              <option value="">Select leave type</option>
              {policies.map(p => <option key={p.id} value={p.id}>{p.name} ({p.days_per_year}d/yr)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>From Date</label>
              <input type="date" className={inputCls} value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>To Date</label>
              <input type="date" className={inputCls} value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} min={form.from_date} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Reason</label>
            <textarea className={inputCls} rows={3} placeholder="Brief reason for leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <button
              type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
