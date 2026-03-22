'use client'
import { useState } from 'react'
import {
  buildCTCBreakdown,
  calculateGratuity,
  formatINR,
  formatINRCompact,
  PT_SLABS,
} from '@/lib/payroll/indian-compliance'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Calculator, Download } from 'lucide-react'

const STATE_OPTIONS = [
  { label: 'Karnataka',    code: 'KA' },
  { label: 'Maharashtra',  code: 'MH' },
  { label: 'Tamil Nadu',   code: 'TN' },
  { label: 'West Bengal',  code: 'WB' },
  { label: 'Andhra/Telangana', code: 'AP' },
  { label: 'Other',        code: 'DEFAULT' },
]

export default function CTCCalculator() {
  const [ctc,           setCtc]          = useState(1200000)
  const [basicPct,      setBasicPct]     = useState(40)
  const [hraPct,        setHraPct]       = useState(20)
  const [state,         setState]        = useState('KA')
  const [regime,        setRegime]       = useState<'new'|'old'>('new')
  const [joinDate,      setJoinDate]     = useState('2020-01-01')
  const [showGratuity,  setShowGratuity] = useState(true)

  const bd = buildCTCBreakdown(ctc, { basicPercent: basicPct, hraPercent: hraPct, stateCode: state, regime })
  const gratuity = calculateGratuity({ joinDate: new Date(joinDate), lastDrawnBasic: bd.earnings.basic })

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1"

  const chartData = [
    { name: 'Basic',       value: bd.earnings.basic,           color: '#22d07a' },
    { name: 'HRA',         value: bd.earnings.hra,             color: '#4d9fff' },
    { name: 'Special',     value: bd.earnings.specialAllowance,color: '#9b6dff' },
    { name: 'PF (Emp)',    value: bd.deductions.employeePF,    color: '#ff5a65' },
    { name: 'TDS',         value: bd.deductions.tds,           color: '#f0a500' },
    { name: 'Net',         value: bd.monthlyNetTakeHome,       color: '#22d07a' },
  ]

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-gold-500/5 to-transparent">
        <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center">
          <Calculator size={16} className="text-gold-500" />
        </div>
        <div>
          <div className="font-display font-bold">CTC Calculator</div>
          <div className="text-xs text-muted-foreground">Indian statutory deductions · FY 2024-25</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* Inputs */}
        <div className="lg:col-span-2 p-5 border-r border-border space-y-4">
          {/* CTC */}
          <div>
            <label className={lbl}>Annual CTC</label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">₹</span>
              <input type="number" className={inp} value={ctc}
                onChange={e => setCtc(Number(e.target.value) || 0)} min={0} step={50000} />
            </div>
            <input type="range" min={300000} max={10000000} step={50000}
              value={ctc} onChange={e => setCtc(Number(e.target.value))}
              className="w-full mt-2 accent-yellow-500" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
              <span>₹3L</span><span>₹1Cr</span>
            </div>
          </div>

          {/* Basic % */}
          <div>
            <div className="flex justify-between mb-1">
              <label className={lbl}>Basic % of CTC</label>
              <span className="text-xs font-bold text-foreground">{basicPct}%</span>
            </div>
            <input type="range" min={30} max={60} value={basicPct}
              onChange={e => setBasicPct(Number(e.target.value))} className="w-full accent-yellow-500" />
          </div>

          {/* HRA % */}
          <div>
            <div className="flex justify-between mb-1">
              <label className={lbl}>HRA % of CTC</label>
              <span className="text-xs font-bold text-foreground">{hraPct}%</span>
            </div>
            <input type="range" min={10} max={40} value={hraPct}
              onChange={e => setHraPct(Number(e.target.value))} className="w-full accent-yellow-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* State */}
            <div>
              <label className={lbl}>State (PT slab)</label>
              <select className={inp} value={state} onChange={e => setState(e.target.value)}>
                {STATE_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>

            {/* Tax regime */}
            <div>
              <label className={lbl}>Tax Regime</label>
              <select className={inp} value={regime} onChange={e => setRegime(e.target.value as any)}>
                <option value="new">New (2024-25)</option>
                <option value="old">Old Regime</option>
              </select>
            </div>
          </div>

          {/* Gratuity */}
          <div>
            <label className={lbl}>Join Date (for Gratuity)</label>
            <input type="date" className={inp} value={joinDate} onChange={e => setJoinDate(e.target.value)} />
          </div>
        </div>

        {/* Output */}
        <div className="lg:col-span-3 p-5 space-y-5">
          {/* Net take-home highlight */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Monthly Gross',    value: formatINR(bd.monthlyGross),         color: '#22d07a' },
              { label: 'Deductions',       value: formatINR(bd.deductions.employeePF + bd.deductions.employeeESI + bd.deductions.professionalTax + bd.deductions.tds), color: '#ff5a65' },
              { label: 'Net Take-Home',    value: formatINR(bd.monthlyNetTakeHome),   color: '#f0a500' },
            ].map(s => (
              <div key={s.label} className="bg-muted/30 rounded-xl p-3 text-center">
                <div className="font-display font-extrabold text-xl" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [formatINR(v)]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {/* Earnings */}
            <div>
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-wide mb-2">Earnings</div>
              {[
                ['Basic',     bd.earnings.basic],
                ['HRA',       bd.earnings.hra],
                ['Special',   bd.earnings.specialAllowance],
                ['Conveyance',bd.earnings.conveyance],
                ['Medical',   bd.earnings.medicalAllowance],
              ].map(([l,v]) => (
                <div key={l as string} className="flex justify-between py-1 border-b border-border/40 text-xs">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-medium text-foreground">{formatINR(v as number)}</span>
                </div>
              ))}
            </div>

            {/* Deductions */}
            <div>
              <div className="text-[10px] font-bold text-destructive uppercase tracking-wide mb-2">Deductions</div>
              {[
                ['PF (Emp 12%)',    bd.deductions.employeePF],
                ['ESI (0.75%)',     bd.deductions.employeeESI],
                ['Prof. Tax',       bd.deductions.professionalTax],
                ['TDS',            bd.deductions.tds],
              ].map(([l,v]) => (
                <div key={l as string} className="flex justify-between py-1 border-b border-border/40 text-xs">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="text-destructive">-{formatINR(v as number)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employer contributions */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-2">Employer Cost (additional)</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ['PF (Employer)',    bd.employerContributions.employerPF],
                ['ESI (3.25%)',      bd.employerContributions.employerESI],
                ['Gratuity Prov.',   bd.employerContributions.gratuityMonthly],
                ['EDLI + Admin',     bd.employerContributions.edli + bd.employerContributions.adminCharges],
              ].map(([l,v]) => (
                <div key={l as string} className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="text-blue-400 font-semibold">{formatINR(v as number)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t border-blue-500/10 text-xs font-bold">
              <span className="text-blue-400">Total Monthly Cost to Company</span>
              <span className="text-blue-400">
                {formatINR(bd.monthlyGross +
                  bd.employerContributions.employerPF +
                  bd.employerContributions.employerESI +
                  bd.employerContributions.gratuityMonthly)}
              </span>
            </div>
          </div>

          {/* Gratuity */}
          <div className={`rounded-xl p-3 border ${gratuity.isEligible ? 'bg-gold-500/5 border-gold-500/20' : 'bg-muted/30 border-border'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-semibold text-foreground">Gratuity</div>
                <div className="text-[10px] text-muted-foreground">{gratuity.yearsOfService}y service · {gratuity.isEligible ? '✅ Eligible' : '⏳ Not yet (5y min)'}</div>
              </div>
              <div className="text-right">
                <div className={`font-display font-bold text-lg ${gratuity.isEligible ? 'text-gold-500' : 'text-muted-foreground'}`}>
                  {formatINRCompact(gratuity.gratuityAmount)}
                </div>
                {gratuity.taxableGratuity > 0 && (
                  <div className="text-[9px] text-destructive">Taxable: {formatINRCompact(gratuity.taxableGratuity)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
