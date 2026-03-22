'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { Target, Star, TrendingUp, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import type { PerformanceReview } from '@/lib/supabase/database.types'

const RATING_LABEL: Record<number, { label: string; color: string }> = {
  5: { label: 'Outstanding',  color: 'text-green-500' },
  4: { label: 'Exceeds',      color: 'text-teal-400' },
  3: { label: 'Meets',        color: 'text-blue-400' },
  2: { label: 'Below',        color: 'text-gold-500' },
  1: { label: 'Needs Work',   color: 'text-destructive' },
}

function RatingBar({ value, max = 5, color = '#f0a500' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value/max)*100}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-foreground w-6 text-right">{value}</span>
    </div>
  )
}

const MOCK_REVIEWS = [
  { name: 'Priya Sharma', code: 'TEC0042', dept: 'Engineering', self: 4.2, manager: 4.5, overall: 4.4, status: 'completed', color: '#6c47ff' },
  { name: 'Rahul Mehta',  code: 'SAL0018', dept: 'Sales',       self: 3.8, manager: 3.5, overall: 3.6, status: 'completed', color: '#f0a500' },
  { name: 'Aisha Nair',   code: 'HR0007',  dept: 'HR',          self: 4.0, manager: 4.2, overall: 4.1, status: 'manager_review', color: '#00c9b1' },
  { name: 'Vikram Singh', code: 'FIN0011', dept: 'Finance',     self: 3.5, manager: null, overall: null, status: 'self_review', color: '#ff5a65' },
  { name: 'Kiran Patel',  code: 'OPS0024', dept: 'DevOps',      self: 4.8, manager: 4.9, overall: 4.9, status: 'completed', color: '#4d9fff' },
  { name: 'Neha Joshi',   code: 'OPS0031', dept: 'Operations',  self: null, manager: null, overall: null, status: 'pending', color: '#9b6dff' },
]

const OKRS = [
  { title: 'Increase ARR by 40%',       level: 'company',    progress: 72, status: 'on_track' },
  { title: 'Hire 20 engineers by Q2',   level: 'department', progress: 60, status: 'at_risk' },
  { title: 'Launch mobile app v2.0',    level: 'department', progress: 90, status: 'on_track' },
  { title: 'Reduce customer churn <5%', level: 'department', progress: 85, status: 'on_track' },
  { title: 'Complete AWS migration',    level: 'individual', progress: 45, status: 'behind' },
  { title: 'Onboard 3 enterprise deals',level: 'individual', progress: 33, status: 'at_risk' },
]

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed:      { label: 'Completed',      color: 'text-green-500 bg-green-500/10',     icon: CheckCircle },
  manager_review: { label: 'Manager Review', color: 'text-blue-400 bg-blue-400/10',        icon: Clock },
  self_review:    { label: 'Self Review',    color: 'text-gold-500 bg-gold-500/10',        icon: Star },
  pending:        { label: 'Pending',        color: 'text-muted-foreground bg-muted',      icon: AlertCircle },
}

const OKR_STATUS: Record<string, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-green-500 bg-green-500/10' },
  at_risk:  { label: 'At Risk',  color: 'text-gold-500 bg-gold-500/10' },
  behind:   { label: 'Behind',   color: 'text-destructive bg-destructive/10' },
}

export default function PerformancePage() {
  const [tab, setTab] = useState<'reviews' | 'okrs'>('reviews')

  const completed = MOCK_REVIEWS.filter(r => r.status === 'completed').length
  const avgRating = MOCK_REVIEWS.filter(r => r.overall).reduce((s, r) => s + (r.overall ?? 0), 0) / MOCK_REVIEWS.filter(r => r.overall).length

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Performance Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Q1 2025 Review Cycle · Active</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20">
          <Plus size={13} /> New Review Cycle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Reviews Completed', value: `${completed}/${MOCK_REVIEWS.length}`, color: '#22d07a', icon: CheckCircle },
          { label: 'Avg Team Rating',   value: avgRating.toFixed(1),               color: '#f0a500', icon: Star },
          { label: 'Active OKRs',       value: OKRS.length,                        color: '#4d9fff', icon: Target },
          { label: 'Avg OKR Progress',  value: `${Math.round(OKRS.reduce((s,o) => s+o.progress,0)/OKRS.length)}%`, color: '#9b6dff', icon: TrendingUp },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 w-fit mb-5">
        {[['reviews','Performance Reviews'],['okrs','OKRs & Goals']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {tab === 'reviews' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Employee','Department','Self Rating','Manager Rating','Overall','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_REVIEWS.map((r, i) => {
                const sc = STATUS_CFG[r.status]
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: r.color }}>
                          {r.name.split(' ').map(w=>w[0]).join('')}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.dept}</td>
                    <td className="px-4 py-3">
                      {r.self ? <div className="w-24"><RatingBar value={r.self} /></div> : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.manager ? <div className="w-24"><RatingBar value={r.manager} color="#4d9fff" /></div> : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.overall ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-extrabold text-lg" style={{ color: r.overall >= 4 ? '#22d07a' : r.overall >= 3 ? '#4d9fff' : '#f0a500' }}>{r.overall}</span>
                          <span className="text-[10px] text-muted-foreground">/5</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${sc.color}`}>
                        <sc.icon size={9} /> {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-gold-500 font-medium hover:text-gold-400">View →</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* OKRs */}
      {tab === 'okrs' && (
        <div className="space-y-3">
          {OKRS.map((okr, i) => {
            const sc = OKR_STATUS[okr.status]
            const progressColor = okr.progress >= 80 ? '#22d07a' : okr.progress >= 50 ? '#f0a500' : '#ff5a65'
            return (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        okr.level === 'company' ? 'bg-purple-500/10 text-purple-400' :
                        okr.level === 'department' ? 'bg-blue-500/10 text-blue-400' : 'bg-muted text-muted-foreground'
                      }`}>{okr.level}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                    </div>
                    <div className="font-semibold text-sm text-foreground mb-3">{okr.title}</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${okr.progress}%`, background: progressColor }} />
                      </div>
                      <span className="text-sm font-bold text-foreground">{okr.progress}%</span>
                    </div>
                  </div>
                  <button className="text-xs text-gold-500 font-medium hover:text-gold-400 whitespace-nowrap">Update →</button>
                </div>
              </div>
            )
          })}
          <button className="w-full py-3 border-2 border-dashed border-border rounded-2xl text-xs text-muted-foreground hover:text-gold-500 hover:border-gold-500/30 transition-colors flex items-center justify-center gap-2">
            <Plus size={12} /> Add OKR
          </button>
        </div>
      )}
    </div>
  )
}
