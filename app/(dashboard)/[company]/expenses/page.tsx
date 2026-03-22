'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Receipt, Check, X, Download, Upload, Eye } from 'lucide-react'
import { formatINR } from '@/lib/payroll/indian-compliance'
import type { ExpenseStatus } from '@/lib/supabase/database.types'

const CATEGORY_ICONS: Record<string, string> = {
  travel: '✈️', meals: '🍽️', accommodation: '🏨', equipment: '💻',
  internet: '🌐', mobile: '📱', training: '🎓', medical: '🏥', other: '📋',
}
const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  submitted: 'bg-gold-500/10 text-gold-500',
  approved:  'bg-green-500/10 text-green-500',
  rejected:  'bg-destructive/10 text-destructive',
  paid:      'bg-blue-500/10 text-blue-400',
}

const TABS: ExpenseStatus[] = ['submitted', 'approved', 'rejected', 'paid']

export default function ExpensesPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId]   = useState('')
  const [claims, setClaims]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<ExpenseStatus>('submitted')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showAdd, setShowAdd]       = useState(false)

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  const fetch = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase.from('expense_claims')
      .select('*, employees(first_name, last_name, employee_code, departments(name))')
      .eq('company_id', companyId).eq('status', tab)
      .order('created_at', { ascending: false })
    setClaims(data ?? [])
    setLoading(false)
  }, [companyId, tab])

  useEffect(() => { fetch() }, [fetch])

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setProcessingId(id)
    const { error } = await supabase.from('expense_claims').update({
      status: action,
      approved_at: action === 'approved' ? new Date().toISOString() : null,
    }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`Expense ${action}`); fetch() }
    setProcessingId(null)
  }

  const totalPending = claims.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Expense Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {claims.length} {tab} · {formatINR(totalPending)} total
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20">
          <Plus size={13} /> New Claim
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 w-fit mb-5">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-20" />
        ))}</div>
      ) : claims.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Receipt size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No {tab} expense claims</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Employee','Claim #','Category','Date','Amount','Description','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map(c => {
                const emp = c.employees
                const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??'
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/70 to-teal-500/70 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">{initials}</div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{emp?.first_name} {emp?.last_name}</div>
                          <div className="text-[10px] text-muted-foreground">{(emp?.departments as any)?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{c.claim_number}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{CATEGORY_ICONS[c.category] ?? '📋'}</span>
                      <span className="text-xs text-muted-foreground ml-1.5 capitalize">{c.category}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(c.expense_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{formatINR(c.amount)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{c.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.receipt_url && <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-400" title="View Receipt"><Eye size={12} /></button>}
                        {tab === 'submitted' && (
                          <>
                            <button onClick={() => handleAction(c.id, 'rejected')} disabled={processingId === c.id}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive" title="Reject">
                              <X size={12} />
                            </button>
                            <button onClick={() => handleAction(c.id, 'approved')} disabled={processingId === c.id}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-green-500" title="Approve">
                              <Check size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddExpenseModal companyId={companyId} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetch() }} />
      )}
    </div>
  )
}

function AddExpenseModal({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'travel', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.amount) { toast.error('Fill required fields'); return }
    setLoading(true)
    const { data: emp } = await supabase.from('employees').select('id').eq('company_id', companyId).single()
    if (!emp) { toast.error('Employee not found'); setLoading(false); return }
    const { error } = await supabase.from('expense_claims').insert({
      company_id: companyId, employee_id: emp.id,
      title: form.title, category: form.category, amount: parseFloat(form.amount),
      expense_date: form.expense_date, description: form.description, status: 'submitted',
    })
    if (error) toast.error(error.message)
    else { toast.success('Expense claim submitted'); onSuccess() }
    setLoading(false)
  }

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-display font-bold text-lg">New Expense Claim</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Title *</label>
            <input className={inp} placeholder="Team lunch at client site" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Category</label>
              <select className={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(CATEGORY_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Amount (₹) *</label>
              <input type="number" className={inp} placeholder="2500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="0" />
            </div>
          </div>
          <div>
            <label className={lbl}>Date *</label>
            <input type="date" className={inp} value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea className={inp} rows={2} placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
