// hooks/useCompany.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/lib/supabase/database.types'

export function useCompany(slug: string) {
  const supabase = createClient()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    supabase.from('companies').select('*').eq('slug', slug).single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setCompany(data)
        setLoading(false)
      })
  }, [slug])

  return { company, loading, error }
}

// hooks/useEmployee.ts
export function useCurrentEmployee(companyId: string) {
  const supabase = createClient()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!companyId) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('employees')
        .select(`*, departments(name), designations(name), manager:employees!manager_id(first_name, last_name)`)
        .eq('company_id', companyId).eq('user_id', user.id).single()
      setEmployee(data)
      setLoading(false)
    })
  }, [companyId])

  return { employee, loading }
}

// hooks/useLeaveBalances.ts
export function useLeaveBalances(employeeId: string, year?: number) {
  const supabase = createClient()
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const currentYear = year ?? new Date().getFullYear()

  useEffect(() => {
    if (!employeeId) return
    supabase.from('leave_balances')
      .select('*, leave_policies(name, leave_type)')
      .eq('employee_id', employeeId)
      .eq('year', currentYear)
      .then(({ data }) => {
        setBalances(data ?? [])
        setLoading(false)
      })
  }, [employeeId, currentYear])

  return { balances, loading }
}

// hooks/useNotifications.ts
export function useNotifications(userId: string) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20)
    setNotifications(data ?? [])
    setUnreadCount(data?.filter(n => !n.is_read).length ?? 0)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetch()
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId).eq('is_read', false)
    fetch()
  }

  return { notifications, unreadCount, markAllRead, refetch: fetch }
}

// hooks/usePayslips.ts
export function usePayslips(employeeId: string) {
  const supabase = createClient()
  const [payslips, setPayslips] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!employeeId) return
    supabase.from('payslips')
      .select('*, payroll_runs(status)')
      .eq('employee_id', employeeId)
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(24)
      .then(({ data }) => {
        setPayslips(data ?? [])
        setLoading(false)
      })
  }, [employeeId])

  return { payslips, loading }
}

// hooks/useAttendance.ts
export function useAttendance(employeeId: string, month: number, year: number) {
  const supabase = createClient()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const to   = `${year}-${String(month).padStart(2,'0')}-31`
    supabase.from('attendance').select('*')
      .eq('employee_id', employeeId)
      .gte('date', from).lte('date', to)
      .order('date')
      .then(({ data }) => {
        setRecords(data ?? [])
        setLoading(false)
      })
  }, [employeeId, month, year])

  const summary = {
    present:     records.filter(r => r.type === 'present').length,
    wfh:         records.filter(r => r.type === 'wfh').length,
    absent:      records.filter(r => r.type === 'absent').length,
    half_day:    records.filter(r => r.type === 'half_day').length,
    totalHours:  records.reduce((s, r) => s + (r.total_hours ?? 0), 0),
    overtimeHrs: records.reduce((s, r) => s + (r.overtime_hours ?? 0), 0),
  }

  return { records, loading, summary }
}
