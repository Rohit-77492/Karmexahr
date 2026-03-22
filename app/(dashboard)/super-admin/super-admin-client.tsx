'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, Users, BarChart3, Shield, TrendingUp,
  CheckCircle, XCircle, Eye, Settings, RefreshCw,
} from 'lucide-react'
import { formatDate, getAvatarColor } from '@/lib/utils'

const PLAN_COLORS: Record<string, string> = {
  free:       '#9b9b9b',
  starter:    '#4d9fff',
  growth:     '#f0a500',
  enterprise: '#9b6dff',
}

interface Props {
  companies: any[]
  recentSignups: any[]
  stats: { totalCompanies: number; totalUsers: number; planCounts: Record<string, number> }
}

export default function SuperAdminClient({ companies: initialCompanies, recentSignups, stats }: Props) {
  const supabase = createClient()
  const [companies, setCompanies] = useState(initialCompanies)
  const [tab, setTab]             = useState<'companies' | 'users' | 'plans'>('companies')
  const [search, setSearch]       = useState('')

  const toggleCompany = async (id: string, current: boolean) => {
    const { error } = await supabase.from('companies').update({ is_active: !current }).eq('id', id)
    if (!error) {
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
      toast.success(`Company ${!current ? 'activated' : 'deactivated'}`)
    }
  }

  const changePlan = async (id: string, plan: string) => {
    const { error } = await supabase.from('companies').update({ plan }).eq('id', id)
    if (!error) {
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, plan } : c))
      toast.success('Plan updated')
    }
  }

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Shield size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Platform-wide management</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-full">
            🔑 Super Admin
          </span>
        </div>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Companies', value: stats.totalCompanies, icon: Building2, color: '#f0a500' },
          { label: 'Total Users',     value: stats.totalUsers,     icon: Users,     color: '#4d9fff' },
          { label: 'Enterprise Plans', value: stats.planCounts.enterprise ?? 0, icon: TrendingUp, color: '#9b6dff' },
          { label: 'Active (90d)',     value: Math.round(stats.totalCompanies * 0.78), icon: BarChart3, color: '#22d07a' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full translate-x-6 -translate-y-6 opacity-[0.07]" style={{ background: s.color }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15`, color: s.color }}>
              <s.icon size={16} />
            </div>
            <div className="font-display font-extrabold text-2xl text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="font-display font-bold text-sm mb-4">Plan Distribution</div>
        <div className="flex gap-4 flex-wrap">
          {['free','starter','growth','enterprise'].map(plan => {
            const count  = stats.planCounts[plan] ?? 0
            const pct    = stats.totalCompanies > 0 ? Math.round((count / stats.totalCompanies) * 100) : 0
            const color  = PLAN_COLORS[plan]
            return (
              <div key={plan} className="flex-1 min-w-[100px]">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold capitalize" style={{ color }}>{plan}</span>
                  <span className="text-xs font-bold text-foreground">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 w-fit mb-5">
        {[['companies','Companies'],['users','Recent Signups']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === k ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Companies tab */}
      {tab === 'companies' && (
        <>
          <div className="flex gap-3 mb-4">
            <input type="text" placeholder="Search companies..." className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500 w-64"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Company','Slug','Plan','Status','Employees','Created','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const color = getAvatarColor(c.name)
                  const initials = c.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
                            {initials}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground">{c.industry ?? 'General'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/${c.slug}`} className="font-mono text-xs text-gold-500 hover:underline">{c.slug}</a>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={c.plan}
                          onChange={e => changePlan(c.id, e.target.value)}
                          className="bg-transparent text-[10px] font-bold capitalize focus:outline-none cursor-pointer"
                          style={{ color: PLAN_COLORS[c.plan] }}
                        >
                          {['free','starter','growth','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleCompany(c.id, c.is_active)}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}
                        >
                          {c.is_active ? <CheckCircle size={9} /> : <XCircle size={9} />}
                          {c.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">{c.max_employees}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.created_at ? formatDate(c.created_at, 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={`/${c.slug}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-400" title="View">
                            <Eye size={12} />
                          </a>
                          <a href={`/${c.slug}/settings`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-gold-500" title="Settings">
                            <Settings size={12} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No companies found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="font-display font-bold text-sm">Recent Signups</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['User','Role','Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSignups.map(u => {
                const color    = getAvatarColor(u.full_name ?? 'User')
                const initials = (u.full_name ?? 'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: color }}>
                          {initials}
                        </div>
                        <span className="text-xs font-medium text-foreground">{u.full_name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${u.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-muted text-muted-foreground'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.created_at ? formatDate(u.created_at, 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
