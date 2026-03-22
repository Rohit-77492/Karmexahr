'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, MapPin, Laptop, Building2, CheckCircle, Loader2 } from 'lucide-react'
import type { AttendanceRecord } from '@/lib/supabase/database.types'

const TYPE_COLOR: Record<string, string> = {
  present:  '#22d07a', wfh: '#4d9fff', on_duty: '#00c9b1',
  absent:   '#ff5a65', half_day: '#f0a500', holiday: '#9b6dff',
  weekend:  '#1a2035', lwp: '#ff5a65',
}

function AttendanceHeatmap({ records, month, year }: { records: AttendanceRecord[]; month: number; year: number }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const recMap = Object.fromEntries(records.map(r => [r.date.split('T')[0], r]))

  return (
    <div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          ['Present', '#22d07a'], ['WFH', '#4d9fff'], ['Holiday', '#9b6dff'],
          ['Leave', '#f0a500'], ['Absent', '#ff5a65'], ['Weekend', '#1a2035'],
        ].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
            {l}
          </div>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const rec = recMap[dateStr]
          const dow = new Date(dateStr).getDay()
          const isWeekend = dow === 0 || dow === 6
          const color = rec ? TYPE_COLOR[rec.type] : isWeekend ? TYPE_COLOR.weekend : 'hsl(var(--muted))'
          return (
            <div
              key={d}
              title={`${dateStr}: ${rec?.type ?? (isWeekend ? 'Weekend' : 'No record')}`}
              className="aspect-square rounded-sm hover:scale-125 transition-transform cursor-pointer"
              style={{ background: color, opacity: rec || isWeekend ? 1 : 0.4 }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([])
  const [teamToday, setTeamToday] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [clocking, setClocking] = useState(false)
  const [now, setNow] = useState(new Date())
  const today = new Date().toISOString().split('T')[0]
  const month = new Date().getMonth() + 1
  const year  = new Date().getFullYear()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  useEffect(() => {
    if (!companyId) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: emp } = await supabase.from('employees').select('id').eq('company_id', companyId).eq('user_id', user.id).single()
      if (emp) setEmployeeId(emp.id)
    })
  }, [companyId])

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const [{ data: today_rec }, { data: month_recs }, { data: team }] = await Promise.all([
      supabase.from('attendance').select('*').eq('company_id', companyId).eq('employee_id', employeeId).eq('date', today).single(),
      supabase.from('attendance').select('*').eq('company_id', companyId).eq('employee_id', employeeId)
        .gte('date', `${year}-${String(month).padStart(2,'0')}-01`)
        .lte('date', `${year}-${String(month).padStart(2,'0')}-31`),
      supabase.from('attendance').select(`*, employees(first_name, last_name, departments(name))`)
        .eq('company_id', companyId).eq('date', today).order('clock_in', { ascending: false }).limit(20),
    ])
    setTodayRecord(today_rec as any)
    setMonthRecords(month_recs as any ?? [])
    setTeamToday(team ?? [])
    setLoading(false)
  }, [companyId, employeeId, today, month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const clockIn = async (type: 'present' | 'wfh') => {
    if (!employeeId) { toast.error('Employee record not found'); return }
    setClocking(true)
    const { error } = await supabase.from('attendance').upsert({
      company_id: companyId, employee_id: employeeId,
      date: today, clock_in: new Date().toISOString(),
      type, source: 'web',
    }, { onConflict: 'employee_id,date' })
    if (error) toast.error(error.message)
    else { toast.success(`Clocked in as ${type === 'wfh' ? 'WFH' : 'Present'}`); fetchData() }
    setClocking(false)
  }

  const clockOut = async () => {
    if (!todayRecord) return
    setClocking(true)
    const { error } = await supabase.from('attendance').update({ clock_out: new Date().toISOString() }).eq('id', todayRecord.id)
    if (error) toast.error(error.message)
    else { toast.success('Clocked out'); fetchData() }
    setClocking(false)
  }

  const presentCount  = teamToday.filter(a => ['present','wfh','on_duty'].includes(a.type)).length
  const absentCount   = teamToday.filter(a => a.type === 'absent').length
  const monthPresent  = monthRecords.filter(r => ['present','wfh','on_duty'].includes(r.type)).length
  const totalHours    = monthRecords.reduce((s, r) => s + (r.total_hours ?? 0), 0)

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Clock widget */}
        <div className="bg-gradient-to-br from-gold-500/10 to-orange-500/5 border border-gold-500/20 rounded-2xl p-6">
          <div className="font-display font-extrabold text-4xl text-foreground mb-1">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-sm text-muted-foreground mb-6">Current time · IST</div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-muted/50 rounded-xl" />
              <div className="h-10 bg-muted/50 rounded-xl" />
            </div>
          ) : !todayRecord ? (
            <div className="space-y-2">
              <button onClick={() => clockIn('present')} disabled={clocking} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/20 text-green-500 font-semibold text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50">
                {clocking ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />} Clock In (Office)
              </button>
              <button onClick={() => clockIn('wfh')} disabled={clocking} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 text-blue-400 font-semibold text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                {clocking ? <Loader2 size={15} className="animate-spin" /> : <Laptop size={15} />} Work From Home
              </button>
            </div>
          ) : !todayRecord.clock_out ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-500 font-semibold">
                <CheckCircle size={16} /> Clocked in at {todayRecord.clock_in ? new Date(todayRecord.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
              <button onClick={clockOut} disabled={clocking} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors disabled:opacity-50">
                {clocking ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />} Clock Out
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Clock In</span>
                <span className="font-medium text-foreground">{new Date(todayRecord.clock_in!).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Clock Out</span>
                <span className="font-medium text-foreground">{new Date(todayRecord.clock_out!).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-display font-bold text-green-500">{todayRecord.total_hours?.toFixed(1)}h</span>
              </div>
            </div>
          )}
        </div>

        {/* Monthly heatmap */}
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-bold text-sm">Monthly Overview — {new Date().toLocaleString('default', { month:'long', year:'numeric' })}</div>
          </div>
          <AttendanceHeatmap records={monthRecords} month={month} year={year} />
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
            {[
              { label: 'Days Present', value: monthPresent, color: '#22d07a' },
              { label: 'Days Absent',  value: monthRecords.filter(r => r.type === 'absent').length, color: '#ff5a65' },
              { label: 'Total Hours',  value: `${totalHours.toFixed(0)}h`, color: '#4d9fff' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-display font-extrabold text-xl" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team today */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-display font-bold text-sm">Team Status Today</div>
          <div className="flex gap-3 text-xs">
            <span className="text-green-500 font-semibold">{presentCount} present</span>
            <span className="text-destructive font-semibold">{absentCount} absent</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Employee','Clock In','Clock Out','Hours','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamToday.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No attendance records for today yet</td></tr>
              ) : teamToday.map(a => {
                const emp = a.employees
                const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??'
                return (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/70 to-teal-500/70 flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{emp?.first_name} {emp?.last_name}</div>
                          <div className="text-[10px] text-muted-foreground">{(emp?.departments as any)?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{a.clock_in ? new Date(a.clock_in).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{a.total_hours ? `${a.total_hours}h` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${TYPE_COLOR[a.type]}18`, color: TYPE_COLOR[a.type] }}>
                        {a.type.replace(/_/g,' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
