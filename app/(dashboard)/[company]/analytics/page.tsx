'use client'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Download, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import { formatINRCompact } from '@/lib/payroll/indian-compliance'

// ── Mock data ─────────────────────────────────────────────────

const ATTRITION = [
  { month: 'Apr', hired: 8, left: 3, net: 5 },
  { month: 'May', hired: 12, left: 5, net: 7 },
  { month: 'Jun', hired: 6, left: 2, net: 4 },
  { month: 'Jul', hired: 9, left: 4, net: 5 },
  { month: 'Aug', hired: 15, left: 6, net: 9 },
  { month: 'Sep', hired: 7, left: 8, net: -1 },
  { month: 'Oct', hired: 11, left: 3, net: 8 },
  { month: 'Nov', hired: 8, left: 5, net: 3 },
  { month: 'Dec', hired: 4, left: 9, net: -5 },
  { month: 'Jan', hired: 10, left: 4, net: 6 },
  { month: 'Feb', hired: 13, left: 3, net: 10 },
  { month: 'Mar', hired: 8, left: 2, net: 6 },
]

const PAYROLL_COST = [
  { month: 'Oct', salaries: 12400000, pf: 1488000, esi: 403000, bonus: 0 },
  { month: 'Nov', salaries: 12600000, pf: 1512000, esi: 410000, bonus: 0 },
  { month: 'Dec', salaries: 12800000, pf: 1536000, esi: 416000, bonus: 2500000 },
  { month: 'Jan', salaries: 12700000, pf: 1524000, esi: 413000, bonus: 0 },
  { month: 'Feb', salaries: 12900000, pf: 1548000, esi: 420000, bonus: 0 },
  { month: 'Mar', salaries: 13100000, pf: 1572000, esi: 427000, bonus: 0 },
]

const DEPT_PERF = [
  { dept: 'Engineering', performance: 87, attendance: 94, retention: 91, training: 78 },
  { dept: 'Sales',       performance: 82, attendance: 88, retention: 79, training: 85 },
  { dept: 'HR & Admin',  performance: 90, attendance: 97, retention: 94, training: 92 },
  { dept: 'Finance',     performance: 88, attendance: 95, retention: 96, training: 88 },
  { dept: 'Operations',  performance: 79, attendance: 91, retention: 85, training: 72 },
]

const LEAVE_DIST = [
  { name: 'Annual Leave',    value: 38, color: '#f0a500' },
  { name: 'Sick Leave',      value: 24, color: '#ff5a65' },
  { name: 'Casual Leave',    value: 22, color: '#4d9fff' },
  { name: 'WFH',             value: 10, color: '#22d07a' },
  { name: 'Other',           value: 6,  color: '#9b6dff' },
]

const ATTENDANCE_TREND = [
  { week: 'W1 Mar', pct: 91 }, { week: 'W2 Mar', pct: 88 },
  { week: 'W3 Mar', pct: 94 }, { week: 'W4 Mar', pct: 92 },
]

const GENDER_DATA = [
  { name: 'Male',   value: 158, color: '#4d9fff' },
  { name: 'Female', value: 84,  color: '#f0a500' },
  { name: 'Other',  value: 6,   color: '#9b6dff' },
]

// ── KPI Card ──────────────────────────────────────────────────

function KPI({
  label, value, prev, unit = '', color = '#f0a500', format,
}: {
  label: string; value: number; prev: number; unit?: string
  color?: string; format?: (n: number) => string
}) {
  const diff  = value - prev
  const pct   = prev ? Math.abs(Math.round((diff / prev) * 100)) : 0
  const up    = diff >= 0
  const fmt   = format ?? ((n: number) => `${n}${unit}`)

  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full translate-x-8 -translate-y-8 opacity-[0.07]" style={{ background: color }} />
      <div className="text-xs text-muted-foreground mb-2 font-medium">{label}</div>
      <div className="font-display font-extrabold text-3xl text-foreground leading-none mb-2">{fmt(value)}</div>
      <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-green-500' : 'text-destructive'}`}>
        {diff === 0 ? <Minus size={11} className="text-muted-foreground" /> : up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {pct > 0 ? `${pct}% vs last month` : 'No change'}
      </div>
    </div>
  )
}

// ── Chart Card wrapper ────────────────────────────────────────

function ChartCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string
  children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-display font-bold text-sm">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 },
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('6m')

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics & Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">People metrics for Q1 FY 2024-25</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1">
            {(['1m','3m','6m','1y'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {p}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium hover:bg-muted/50">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KPI label="Total Headcount" value={248} prev={238} color="#f0a500" />
        <KPI label="Attrition Rate"  value={4.8} prev={6.2}  color="#ff5a65" unit="%" format={n => `${n}%`} />
        <KPI label="Avg Tenure"      value={2.4} prev={2.2}  color="#4d9fff" unit="y" format={n => `${n}y`} />
        <KPI label="Payroll Cost"    value={13100000} prev={12900000} color="#9b6dff" format={formatINRCompact} />
        <KPI label="Avg Performance" value={84} prev={80} color="#22d07a" unit="%" format={n => `${n}%`} />
        <KPI label="Attendance"      value={93} prev={91} color="#00c9b1" unit="%" format={n => `${n}%`} />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Attrition */}
        <ChartCard
          title="Hiring vs Attrition"
          subtitle="Last 12 months"
          action={<span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-lg">Net: +{ATTRITION.reduce((s,d) => s + d.net, 0)}</span>}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ATTRITION}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="hired" fill="#22d07a" opacity={0.9} radius={[3,3,0,0]} name="Hired" />
              <Bar dataKey="left"  fill="#ff5a65" opacity={0.8} radius={[3,3,0,0]} name="Left" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payroll cost */}
        <ChartCard title="Payroll Cost Breakdown" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={PAYROLL_COST}>
              <defs>
                <linearGradient id="salGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9b6dff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9b6dff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₹${formatINRCompact(v)}`} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`₹${formatINRCompact(v)}`]} {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="salaries" stroke="#9b6dff" fill="url(#salGrad)" strokeWidth={2} name="Salaries" />
              <Line type="monotone" dataKey="pf" stroke="#f0a500" strokeWidth={1.5} dot={false} name="PF" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gender diversity */}
        <ChartCard title="Workforce Diversity" subtitle="Gender distribution">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={GENDER_DATA} cx={60} cy={60} innerRadius={38} outerRadius={58}
                    dataKey="value" strokeWidth={3} stroke="hsl(var(--background))">
                    {GENDER_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {GENDER_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <div className="flex-1 text-xs text-muted-foreground">{d.name}</div>
                  <div className="text-xs font-bold text-foreground">{d.value}</div>
                  <div className="text-[10px] text-muted-foreground">({Math.round(d.value/248*100)}%)</div>
                </div>
              ))}
            </div>
          </div>
          {/* Diversity score */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Inclusion Index</span>
              <span className="font-bold text-foreground">74 / 100</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold-500 to-orange-500 rounded-full" style={{ width: '74%' }} />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Department radar */}
        <ChartCard title="Department Performance Matrix" subtitle="Scores out of 100">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={DEPT_PERF}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar name="Performance" dataKey="performance" stroke="#f0a500" fill="#f0a500" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Attendance"  dataKey="attendance"  stroke="#00c9b1" fill="#00c9b1" fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="Retention"   dataKey="retention"   stroke="#9b6dff" fill="#9b6dff" fillOpacity={0.1} strokeWidth={1.5} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }} />
              <Tooltip {...TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Leave distribution */}
        <ChartCard title="Leave Distribution" subtitle="By type — YTD">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={LEAVE_DIST} cx={75} cy={75} outerRadius={70}
                    dataKey="value" strokeWidth={2} stroke="hsl(var(--background))" label={({ name, percent }) => `${Math.round(percent*100)}%`}
                    labelLine={false}>
                    {LEAVE_DIST.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {LEAVE_DIST.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                    <span className="text-xs font-bold text-foreground">{d.value}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
            {[
              { label: 'Avg per Employee', value: '14.2d' },
              { label: 'Pending Approval', value: '23' },
              { label: 'LWP Days YTD',     value: '48' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-display font-bold text-lg text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Dept breakdown table */}
      <ChartCard title="Department Summary" subtitle="Headcount · Payroll · Performance · Vacancies">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Department','Headcount','Avg CTC','Payroll Cost','Attendance','Performance','Open Positions'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { dept: 'Engineering',  count: 87, avgCtc: 1650000, payroll: 11962500, att: 94, perf: 87, open: 12 },
                { dept: 'Sales',        count: 66, avgCtc: 1200000, payroll: 6600000,  att: 88, perf: 82, open: 5 },
                { dept: 'Operations',   count: 54, avgCtc: 900000,  payroll: 4050000,  att: 91, perf: 79, open: 3 },
                { dept: 'HR & Admin',   count: 28, avgCtc: 1100000, payroll: 2566667,  att: 97, perf: 90, open: 2 },
                { dept: 'Finance',      count: 13, avgCtc: 1400000, payroll: 1516667,  att: 95, perf: 88, open: 1 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3 text-xs font-semibold text-foreground">{row.dept}</td>
                  <td className="py-3 px-3 text-xs text-foreground">{row.count}</td>
                  <td className="py-3 px-3 text-xs text-foreground">{formatINRCompact(row.avgCtc)}</td>
                  <td className="py-3 px-3 text-xs font-semibold text-foreground">{formatINRCompact(row.payroll)}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${row.att}%` }} />
                      </div>
                      <span className="text-xs text-foreground">{row.att}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gold-500" style={{ width: `${row.perf}%` }} />
                      </div>
                      <span className="text-xs text-foreground">{row.perf}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-semibold ${row.open > 5 ? 'text-destructive' : 'text-gold-500'}`}>{row.open}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
