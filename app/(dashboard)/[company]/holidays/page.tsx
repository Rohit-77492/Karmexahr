'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Calendar, Gift, Building2, Flag, Trash2 } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  national: { label: 'National', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Flag },
  festival: { label: 'Festival', color: 'text-gold-500', bg: 'bg-gold-500/10', icon: Gift },
  company:  { label: 'Company',  color: 'text-purple-400', bg: 'bg-purple-400/10', icon: Building2 },
  optional: { label: 'Optional', color: 'text-muted-foreground', bg: 'bg-muted', icon: Calendar },
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function HolidaysPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId] = useState('')
  const [holidays, setHolidays]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  useEffect(() => {
    if (!companyId) return
    supabase.from('holidays').select('*').eq('company_id', companyId)
      .gte('date', `${yearFilter}-01-01`).lte('date', `${yearFilter}-12-31`)
      .order('date')
      .then(({ data }) => { setHolidays(data ?? []); setLoading(false) })
  }, [companyId, yearFilter])

  const deleteHoliday = async (id: string) => {
    const { error } = await supabase.from('holidays').delete().eq('id', id)
    if (!error) { setHolidays(prev => prev.filter(h => h.id !== id)); toast.success('Holiday removed') }
  }

  const byMonth = MONTHS.map((month, i) =>
    holidays.filter(h => new Date(h.date).getMonth() === i)
  )

  const totalWorkingDays = () => {
    let days = 0
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(yearFilter, m + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(yearFilter, m, d).getDay()
        if (dow !== 0 && dow !== 6) days++
      }
    }
    return days - holidays.filter(h => {
      const dow = new Date(h.date).getDay()
      return dow !== 0 && dow !== 6 && h.holiday_type !== 'optional'
    }).length
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Holiday Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {holidays.length} holidays · {totalWorkingDays()} working days in {yearFilter}
          </p>
        </div>
        <div className="flex gap-2">
          <select className="bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20">
            <Plus size={13} /> Add Holiday
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {Object.entries(TYPE_CONFIG).map(([k, v]) => (
          <div key={k} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${v.bg} ${v.color}`}>
            <v.icon size={11} /> {v.label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MONTHS.map((month, mi) => {
          const monthHolidays = byMonth[mi]
          return (
            <div key={month} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="font-display font-bold text-sm">{month} {yearFilter}</div>
                <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {monthHolidays.length} holiday{monthHolidays.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-2">
                {monthHolidays.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground/50">No holidays</div>
                ) : (
                  monthHolidays.map(h => {
                    const tc = TYPE_CONFIG[h.holiday_type] ?? TYPE_CONFIG.optional
                    const day = new Date(h.date).getDate()
                    const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(h.date).getDay()]
                    return (
                      <div key={h.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 group transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${tc.bg}`}>
                          <div className={`font-display font-extrabold text-sm leading-none ${tc.color}`}>{day}</div>
                          <div className={`text-[8px] font-medium ${tc.color} opacity-70`}>{dow}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{h.name}</div>
                          <div className={`text-[10px] font-medium ${tc.color}`}>{tc.label}</div>
                        </div>
                        <button onClick={() => deleteHoliday(h.id)}
                          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && <AddHolidayModal companyId={companyId} onClose={() => setShowAdd(false)}
        onSuccess={(h) => { setHolidays(prev => [...prev, h].sort((a,b) => a.date.localeCompare(b.date))); setShowAdd(false) }} />}
    </div>
  )
}

function AddHolidayModal({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: (h: any) => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ name: '', date: '', holiday_type: 'national', is_optional: false })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.date) { toast.error('Fill required fields'); return }
    setLoading(true)
    const { data, error } = await supabase.from('holidays').insert({ ...form, company_id: companyId }).select().single()
    if (error) toast.error(error.message)
    else { toast.success('Holiday added'); onSuccess(data) }
    setLoading(false)
  }

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-bold">Add Holiday</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className={lbl}>Holiday Name *</label>
            <input className={inp} placeholder="Diwali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>Date *</label>
            <input type="date" className={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>Type</label>
            <select className={inp} value={form.holiday_type} onChange={e => setForm(f => ({ ...f, holiday_type: e.target.value }))}>
              <option value="national">National Holiday</option>
              <option value="festival">Festival</option>
              <option value="company">Company Holiday</option>
              <option value="optional">Optional Holiday</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold disabled:opacity-50">
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
