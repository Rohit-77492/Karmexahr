'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Users, UserCheck, CalendarOff, Briefcase, Banknote, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, Bell, Gift, AlertCircle,
} from 'lucide-react'
import type { Company } from '@/lib/supabase/database.types'

interface Props {
  company: Company
  stats: {
    totalEmployees: number; presentToday: number; onLeave: number
    openPositions: number; pendingLeaves: number; pendingExpenses: number
    monthlyPayroll: number; monthlyPayrollFmt: string; attendancePct: number
  }
}

const HEADCOUNT_DATA = [
  { month: 'Sep', count: 218 }, { month: 'Oct', count: 224 },
  { month: 'Nov', count: 229 }, { month: 'Dec', count: 232 },
  { month: 'Jan', count: 238 }, { month: 'Feb', count: 243 },
  { month: 'Mar', count: 248 },
]

const DEPT_DATA = [
  { name: 'Engineering', value: 87, color: '#4d9fff' },
  { name: 'Sales',       value: 66, color: '#f0a500' },
  { name: 'Operations',  value: 54, color: '#00c9b1' },
  { name: 'HR & Admin',  value: 28, color: '#9b6dff' },
  { name: 'Finance',     value: 13, color: '#ff5a65' },
]

const PAYROLL_TREND = [
  { month: 'Sep', gross: 13200000, net: 11800000 },
  { month: 'Oct', gross: 13400000, net: 11900000 },
  { month: 'Nov', gross: 13600000, net: 12100000 },
  { month: 'Dec', gross: 14000000, net: 12400000 },
  { month: 'Jan', gross: 13900000, net: 12300000 },
  { month: 'Feb', gross: 14100000, net: 12500000 },
  { month: 'Mar', gross: 14240000, net: 12820000 },
]

const ACTIVITY = [
  { color: '#22d07a', text: <><strong>Priya Sharma</strong> checked in at 9:02 AM (Remote)</>,  time: 'Just now' },
  { color: '#f0a500', text: <><strong>Rohan Das</strong> submitted expense claim ₹4,800</>,       time: '14m ago' },
  { color: '#4d9fff', text: <><strong>Kiran Patel</strong> completed "Leadership Essentials"</>,  time: '1h ago' },
  { color: '#ff5a65', text: <><strong>Aisha Nair</strong> raised IT support ticket #1284</>,      time: '2h ago' },
  { color: '#9b6dff', text: <><strong>Vikram Singh</strong> updated emergency contacts</>,        time: '3h ago' },
  { color: '#00c9b1', text: <><strong>HR Admin</strong> published March 2025 payslips</>,        time: 'Yesterday' },
]

const BIRTHDAYS = [
  { name: 'Priya Sharma',  dept: 'Engineering', date: 'Mar 22', color: '#6c47ff' },
  { name: 'Rahul Mehta',   dept: 'Sales',       date: 'Mar 25', color: '#f0a500' },
  { name: 'Aisha Nair',    dept: 'HR',          date: 'Mar 27', color: '#00c9b1' },
  { name: 'Vikram Singh',  dept: 'Finance',     date: 'Mar 30', color: '#ff5a65' },
  { name: 'Neha Joshi',    dept: 'Operations',  date: 'Apr 2',  color: '#4d9fff' },
]

function StatCard({
  label, value, icon: Icon, color, change, changeUp, sub,
}: {
  label: string; value: string | number; icon: React.ElementType
  color: string; change?: string; changeUp?: boolean; sub?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-border/80 transition-colors group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full translate-x-8 -translate-y-8 opacity-[0.07]" style={{ background: color }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}18`, color }}>
        <Icon size={18} />
      </div>
      <div className="font-display font-extrabold text-3xl text-foreground leading-none mb-1">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      {change && (
        <div className={`flex items-center gap-1 text-xs mt-2 font-medium ${changeUp ? 'text-green-500' : 'text-destructive'}`}>
          {changeUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
    </div>
  )
}

export default function DashboardClient({ company, stats }: Props) {
  const [tab, setTab] = useState<'headcount' | 'payroll'>('headcount')

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(n)

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Announcement banner */}
      <div className="bg-gradient-to-r from-gold-500/10 to-orange-500/5 border border-gold-500/20 rounded-2xl px-5 py-4 flex gap-4 items-start mb-6">
        <Bell size={18} className="text-gold-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-sm text-foreground">🎉 Q1 All-Hands Meeting — March 28, 2025</div>
          <div className="text-xs text-muted-foreground mt-1">Join us at 3:00 PM IST. Agenda includes product roadmap, people updates, and Q2 OKRs.</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Employees"  value={stats.totalEmployees}  icon={Users}      color="#f0a500" change="+6 this month" changeUp />
        <StatCard label="Present Today"    value={stats.presentToday}    icon={UserCheck}  color="#00c9b1" sub={`${stats.attendancePct}% attendance`} />
        <StatCard label="On Leave"         value={stats.onLeave}         icon={CalendarOff} color="#ff5a65" sub={`${stats.pendingLeaves} pending approval`} />
        <StatCard label="Open Positions"   value={stats.openPositions}   icon={Briefcase}  color="#4d9fff" change="+3 this month" changeUp />
        <StatCard label="Monthly Payroll"  value={stats.monthlyPayrollFmt} icon={Banknote} color="#9b6dff" change="+2.3% vs last" changeUp />
        <StatCard label="Avg Performance"  value="84%"                   icon={TrendingUp} color="#22d07a" change="+4pts vs Q4"   changeUp />
      </div>

      {/* Pending alerts */}
      {(stats.pendingLeaves > 0 || stats.pendingExpenses > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {stats.pendingLeaves > 0 && (
            <Link href="leaves" className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs font-medium text-orange-500 hover:bg-orange-500/15 transition-colors">
              <AlertCircle size={13} /> {stats.pendingLeaves} leave requests pending approval
            </Link>
          )}
          {stats.pendingExpenses > 0 && (
            <Link href="expenses" className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs font-medium text-blue-400 hover:bg-blue-500/15 transition-colors">
              <AlertCircle size={13} /> {stats.pendingExpenses} expense claims pending review
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left col: Charts */}
        <div className="xl:col-span-2 space-y-6">
          {/* Trend chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display font-bold text-sm">Trends</div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {(['headcount','payroll'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${tab === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t === 'headcount' ? 'Headcount' : 'Payroll'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              {tab === 'headcount' ? (
                <AreaChart data={HEADCOUNT_DATA}>
                  <defs>
                    <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f0a500" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f0a500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[200, 260]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#f0a500" strokeWidth={2} fill="url(#hcGrad)" dot={{ fill: '#f0a500', r: 3 }} />
                </AreaChart>
              ) : (
                <BarChart data={PAYROLL_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `₹${fmt(v)}`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`₹${fmt(v)}`]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="gross" fill="#f0a500" opacity={0.9} radius={[4,4,0,0]} name="Gross" />
                  <Bar dataKey="net"   fill="#00c9b1" opacity={0.9} radius={[4,4,0,0]} name="Net" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Dept breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display font-bold text-sm">Headcount by Department</div>
              <Link href="employees" className="text-xs text-gold-500 font-medium">View all →</Link>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={DEPT_DATA} cx={65} cy={65} innerRadius={44} outerRadius={65} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                      {DEPT_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {DEPT_DATA.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <div className="flex-1 text-xs text-muted-foreground">{d.name}</div>
                    <div className="text-xs font-bold text-foreground">{d.value}</div>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.value / 248) * 100}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Activity */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-sm">Recent Activity</div>
              <button className="text-xs text-gold-500 font-medium">View all</button>
            </div>
            <div className="space-y-0">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground leading-relaxed">{a.text}</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Birthdays */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Gift size={14} className="text-gold-500" />
              <div className="font-display font-bold text-sm">Upcoming Birthdays</div>
            </div>
            <div className="space-y-0">
              {BIRTHDAYS.map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: b.color }}>
                    {b.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{b.name}</div>
                    <div className="text-[10px] text-muted-foreground">{b.dept}</div>
                  </div>
                  <div className="text-xs text-muted-foreground/70 font-medium">{b.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick clock-in */}
          <div className="bg-gradient-to-br from-gold-500/15 to-orange-500/5 border border-gold-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-gold-500" />
              <div className="font-display font-bold text-sm">Quick Attendance</div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">You haven't clocked in today</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-semibold py-2.5 rounded-xl hover:bg-green-500/20 transition-colors">
                ✓ Clock In
              </button>
              <button className="bg-muted/50 text-muted-foreground border border-border text-xs font-semibold py-2.5 rounded-xl hover:bg-muted transition-colors">
                WFH Today
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
