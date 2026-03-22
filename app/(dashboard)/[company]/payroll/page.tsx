'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Play, Download, CheckCircle, Clock, AlertCircle,
  ChevronDown, Loader2, FileText, TrendingUp, Users,
  IndianRupee, Eye,
} from 'lucide-react'
import { formatINRCompact, formatINR } from '@/lib/payroll/indian-compliance'
import type { PayrollRun, Payslip, Employee } from '@/lib/supabase/database.types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:      { label: 'Draft',      color: 'text-muted-foreground bg-muted',          icon: Clock },
  processing: { label: 'Processing', color: 'text-gold-500 bg-gold-500/10',            icon: Loader2 },
  processed:  { label: 'Processed',  color: 'text-blue-400 bg-blue-400/10',            icon: CheckCircle },
  paid:       { label: 'Paid',       color: 'text-green-500 bg-green-500/10',          icon: CheckCircle },
  failed:     { label: 'Failed',     color: 'text-destructive bg-destructive/10',      icon: AlertCircle },
}

export default function PayrollPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId] = useState('')
  const [runs, setRuns]           = useState<PayrollRun[]>([])
  const [payslips, setPayslips]   = useState<Payslip[]>([])
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const [loading, setLoading]     = useState(true)
  const [running, setRunning]     = useState(false)
  const [showRunModal, setShowRunModal] = useState(false)
  const [runMonth, setRunMonth]   = useState(new Date().getMonth() + 1)
  const [runYear, setRunYear]     = useState(new Date().getFullYear())

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    supabase.from('payroll_runs').select('*')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setRuns((data ?? []) as PayrollRun[])
        if (data && data.length > 0) {
          setSelectedRun(data[0] as PayrollRun)
          loadPayslips(data[0].id)
        }
        setLoading(false)
      })
  }, [companyId])

  const loadPayslips = async (runId: string) => {
    const { data } = await supabase.from('payslips')
      .select(`*, employees(first_name, last_name, employee_code, departments(name))`)
      .eq('run_id', runId)
      .order('net_pay', { ascending: false })
    setPayslips((data ?? []) as any)
  }

  const runPayroll = async () => {
    if (!companyId) return
    setRunning(true)
    try {
      // Create payroll run
      const { data: run, error: createError } = await supabase.from('payroll_runs').insert({
        company_id: companyId,
        month: runMonth,
        year: runYear,
        status: 'draft',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single()

      if (createError) throw createError

      // Trigger processing via DB function
      const { data: result, error: procError } = await supabase.rpc('process_payroll_run', {
        p_run_id: run.id,
        p_company_id: companyId,
      })

      if (procError) throw procError

      toast.success(`Payroll processed for ${result.employees_processed} employees`)
      setShowRunModal(false)

      // Refresh
      const { data: updatedRuns } = await supabase.from('payroll_runs').select('*')
        .eq('company_id', companyId).order('year', { ascending: false }).order('month', { ascending: false }).limit(12)
      setRuns((updatedRuns ?? []) as PayrollRun[])
      if (updatedRuns?.[0]) { setSelectedRun(updatedRuns[0] as PayrollRun); loadPayslips(updatedRuns[0].id) }
    } catch (e: any) {
      toast.error(e.message ?? 'Payroll processing failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">Indian statutory compliance · PF · ESI · TDS · PT</p>
        </div>
        <button
          onClick={() => setShowRunModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-gold-500/20"
        >
          <Play size={13} /> Run Payroll
        </button>
      </div>

      {/* Stats from latest run */}
      {selectedRun && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Gross Payroll', value: formatINRCompact(selectedRun.total_gross), icon: IndianRupee, color: '#f0a500' },
            { label: 'Total Deductions', value: formatINRCompact(selectedRun.total_deductions), icon: TrendingUp, color: '#ff5a65' },
            { label: 'Net Payout', value: formatINRCompact(selectedRun.total_net), icon: CheckCircle, color: '#22d07a' },
            { label: 'Employees', value: selectedRun.total_employees, icon: Users, color: '#4d9fff' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full translate-x-6 -translate-y-6 opacity-[0.07]" style={{ background: s.color }} />
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}18`, color: s.color }}>
                <s.icon size={16} />
              </div>
              <div className="font-display font-extrabold text-2xl text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Run history */}
        <div className="xl:col-span-1">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="font-display font-bold text-sm">Payroll History</div>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 animate-pulse">
                    <div className="h-3 bg-muted rounded w-24 mb-1" />
                    <div className="h-2 bg-muted rounded w-16" />
                  </div>
                ))
              ) : runs.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">No payroll runs yet</div>
              ) : (
                runs.map(run => {
                  const sc = STATUS_CONFIG[run.status]
                  const isSelected = selectedRun?.id === run.id
                  return (
                    <button
                      key={run.id}
                      onClick={() => { setSelectedRun(run); loadPayslips(run.id) }}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${isSelected ? 'bg-gold-500/5 border-l-2 border-gold-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{MONTHS[run.month - 1]} {run.year}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatINRCompact(run.total_net)} net</div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Payslip list */}
        <div className="xl:col-span-3">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="font-display font-bold text-sm">
                {selectedRun ? `Payslips — ${MONTHS[selectedRun.month - 1]} ${selectedRun.year}` : 'Select a payroll run'}
              </div>
              {selectedRun && (
                <button className="flex items-center gap-1.5 text-xs text-gold-500 font-medium hover:text-gold-400">
                  <Download size={12} /> Download All
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Employee','Dept','Working Days','Gross','Deductions','Net Pay',''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payslips.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      {selectedRun ? 'No payslips generated yet. Run payroll first.' : 'Select a payroll run to see payslips.'}
                    </td></tr>
                  ) : (
                    payslips.map(ps => {
                      const emp = (ps as any).employees
                      const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??'
                      return (
                        <tr key={ps.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/80 to-teal-500/80 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-foreground">{emp?.first_name} {emp?.last_name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{emp?.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{(emp?.departments as any)?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-foreground">{ps.present_days}/{ps.working_days}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-foreground">{formatINR(ps.gross_earnings)}</td>
                          <td className="px-4 py-3 text-xs text-destructive">{formatINR(ps.total_deductions)}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-green-500">{formatINR(ps.net_pay)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setSelectedPayslip(ps)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="View"
                              >
                                <Eye size={12} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-gold-500" title="Download PDF">
                                <Download size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Run Payroll Modal ── */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-display font-bold text-lg">Run Payroll</h2>
              <button onClick={() => setShowRunModal(false)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Month</label>
                  <select
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
                    value={runMonth}
                    onChange={e => setRunMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Year</label>
                  <select
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
                    value={runYear}
                    onChange={e => setRunYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
                <p>✓ Salary based on individual CTC structures</p>
                <p>✓ Attendance-based LOP calculated automatically</p>
                <p>✓ PF (12%), ESI (0.75%), Professional Tax applied</p>
                <p>✓ TDS computed under New Tax Regime FY 2024-25</p>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowRunModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                onClick={runPayroll}
                disabled={running}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold disabled:opacity-50"
              >
                {running ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><Play size={14} /> Run Payroll</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payslip Detail Modal ── */}
      {selectedPayslip && (
        <PayslipModal payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
      )}
    </div>
  )
}

function PayslipModal({ payslip, onClose }: { payslip: Payslip; onClose: () => void }) {
  const emp = (payslip as any).employees
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg">Payslip</h2>
            <p className="text-xs text-muted-foreground">{MONTHS[payslip.month - 1]} {payslip.year}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted">
              <Download size={12} /> PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">✕</button>
          </div>
        </div>

        <div className="p-6">
          {/* Employee info */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-muted/30 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center text-lg font-bold text-white">
              {emp ? `${emp.first_name[0]}${emp.last_name[0]}` : '??'}
            </div>
            <div>
              <div className="font-semibold text-foreground">{emp?.first_name} {emp?.last_name}</div>
              <div className="text-xs text-muted-foreground">{emp?.employee_code} · {(emp?.departments as any)?.name}</div>
            </div>
            <div className="ml-auto">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-500">Published</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-xs text-muted-foreground">Working Days: <span className="text-foreground font-medium">{payslip.working_days}</span></div>
            <div className="text-xs text-muted-foreground">Present Days: <span className="text-foreground font-medium">{payslip.present_days}</span></div>
            <div className="text-xs text-muted-foreground">LOP Days: <span className={`font-medium ${payslip.lop_days > 0 ? 'text-destructive' : 'text-foreground'}`}>{payslip.lop_days}</span></div>
          </div>

          {/* Earnings */}
          <div className="border border-border rounded-xl overflow-hidden mb-4">
            <div className="bg-green-500/5 px-4 py-2.5 border-b border-border">
              <span className="text-xs font-bold text-green-500 uppercase tracking-wide">Earnings</span>
            </div>
            {[
              ['Basic Salary', payslip.basic],
              ['HRA', payslip.hra],
              ['Special Allowance', payslip.special_allowance],
              ['Conveyance', payslip.conveyance],
              ['Medical Allowance', payslip.medical_allowance],
            ].filter(([, v]) => (v as number) > 0).map(([l, v]) => (
              <div key={l as string} className="flex justify-between px-4 py-2 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground">{l}</span>
                <span className="text-xs font-medium text-foreground">{formatINR(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-2.5 bg-green-500/5">
              <span className="text-xs font-bold text-green-500">Gross Earnings</span>
              <span className="text-xs font-bold text-green-500">{formatINR(payslip.gross_earnings)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-border rounded-xl overflow-hidden mb-4">
            <div className="bg-destructive/5 px-4 py-2.5 border-b border-border">
              <span className="text-xs font-bold text-destructive uppercase tracking-wide">Deductions</span>
            </div>
            {[
              ['PF (Employee 12%)', payslip.pf_employee],
              ['ESI (Employee 0.75%)', payslip.esi_employee],
              ['Professional Tax', payslip.professional_tax],
              ['Income Tax (TDS)', payslip.income_tax_tds],
              ['Loan Deduction', payslip.loan_deduction],
            ].filter(([, v]) => (v as number) > 0).map(([l, v]) => (
              <div key={l as string} className="flex justify-between px-4 py-2 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground">{l}</span>
                <span className="text-xs font-medium text-destructive">-{formatINR(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-2.5 bg-destructive/5">
              <span className="text-xs font-bold text-destructive">Total Deductions</span>
              <span className="text-xs font-bold text-destructive">-{formatINR(payslip.total_deductions)}</span>
            </div>
          </div>

          {/* Net Pay */}
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gold-500/10 to-orange-500/5 border border-gold-500/20 rounded-xl">
            <span className="font-display font-bold text-base text-foreground">Net Pay</span>
            <span className="font-display font-extrabold text-2xl text-green-500">{formatINR(payslip.net_pay)}</span>
          </div>

          {/* Employer contributions note */}
          <div className="mt-4 p-3 bg-muted/30 rounded-xl">
            <p className="text-[10px] text-muted-foreground">
              Employer PF contribution: {formatINR(payslip.pf_employer)} · Employer ESI: {formatINR(payslip.esi_employer)} (not deducted from salary)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
