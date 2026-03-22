'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Clock } from 'lucide-react'

const LEAVE_COLORS: Record<string, string> = {
  annual:    '#f0a500',
  casual:    '#4d9fff',
  sick:      '#ff5a65',
  maternity: '#9b6dff',
  paternity: '#00c9b1',
  comp_off:  '#ff8c00',
  wfh:       '#22d07a',
  lwp:       '#9b9b9b',
}

interface LeaveBalance {
  id:             string
  allocated:      number
  used:           number
  carried_forward: number
  balance:        number
  leave_policies: {
    name:       string
    leave_type: string
    days_per_year: number
  }
}

interface Props {
  employeeId: string
  compact?:   boolean
}

export default function LeaveBalanceWidget({ employeeId, compact = false }: Props) {
  const supabase = createClient()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading]   = useState(true)
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!employeeId) return
    supabase.from('leave_balances')
      .select('*, leave_policies(name, leave_type, days_per_year)')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .then(({ data }) => {
        setBalances((data ?? []) as LeaveBalance[])
        setLoading(false)
      })
  }, [employeeId])

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
      ))}
    </div>
  )

  if (balances.length === 0) return (
    <div className="text-center py-6 text-xs text-muted-foreground">
      <CalendarDays size={24} className="mx-auto mb-2 opacity-40" />
      No leave balances for {year}
    </div>
  )

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {balances.filter(b => b.leave_policies).map(b => {
        const policy = b.leave_policies
        const color  = LEAVE_COLORS[policy.leave_type] ?? '#9b9b9b'
        const pct    = policy.days_per_year > 0 ? (b.balance / (b.allocated + b.carried_forward)) * 100 : 0

        if (compact) {
          return (
            <div key={b.id} className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">{policy.name}</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>
              </div>
              <div className="text-xs font-bold text-foreground flex-shrink-0">{b.balance}d</div>
            </div>
          )
        }

        return (
          <div key={b.id} className="bg-muted/30 border border-border/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold text-foreground">{policy.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="font-display font-extrabold text-base" style={{ color }}>{b.balance}</span>
                <span className="text-muted-foreground">/ {b.allocated + b.carried_forward}d</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, background: color }} />
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground">
              <div>Allocated: <span className="font-medium text-foreground">{b.allocated}</span></div>
              <div>Used: <span className="font-medium text-foreground">{b.used}</span></div>
              {b.carried_forward > 0 && (
                <div>Carried: <span className="font-medium text-foreground">+{b.carried_forward}</span></div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
