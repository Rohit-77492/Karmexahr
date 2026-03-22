'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Users, Clock, CalendarMinus, Banknote, UserPlus,
  TrendingUp, BarChart3, Settings, ArrowRight, Building2,
  GraduationCap, Loader2,
} from 'lucide-react'

const STATIC_COMMANDS = [
  { label: 'Employees',   icon: Users,          href: '/employees' },
  { label: 'Attendance',  icon: Clock,          href: '/attendance' },
  { label: 'Leaves',      icon: CalendarMinus,  href: '/leaves' },
  { label: 'Payroll',     icon: Banknote,       href: '/payroll' },
  { label: 'Recruitment', icon: UserPlus,       href: '/recruitment' },
  { label: 'Performance', icon: TrendingUp,     href: '/performance' },
  { label: 'Analytics',   icon: BarChart3,      href: '/analytics' },
  { label: 'Training',    icon: GraduationCap,  href: '/training' },
  { label: 'Companies',   icon: Building2,      href: '/companies' },
  { label: 'Settings',    icon: Settings,       href: '/settings' },
]

interface Props {
  company: string
}

export default function CommandPalette({ company }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [selected, setSelected] = useState(0)
  const [employees, setEmployees] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const base = `/${company}`

  // Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50) }
    else { setQuery(''); setEmployees([]) }
  }, [open])

  // Search employees
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setEmployees([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const { data: company_data } = await supabase.from('companies').select('id').eq('slug', company).single()
      if (!company_data) { setSearching(false); return }
      const { data } = await supabase.from('employees')
        .select('id, first_name, last_name, employee_code, departments(name)')
        .eq('company_id', company_data.id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,employee_code.ilike.%${query}%`)
        .limit(5)
      setEmployees(data ?? [])
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const filteredCommands = STATIC_COMMANDS.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase())
  )

  const allResults = [
    ...employees.map(e => ({ type: 'employee' as const, emp: e })),
    ...filteredCommands.map(c => ({ type: 'command' as const, cmd: c })),
  ]

  const navigate = (href: string) => {
    router.push(base + href)
    setOpen(false)
  }

  // Arrow key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && allResults[selected]) {
        const item = allResults[selected]
        if (item.type === 'employee') navigate(`/employees/${item.emp.id}`)
        else navigate(item.cmd.href)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, selected, allResults])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] p-4"
      onClick={() => setOpen(false)}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          {searching ? <Loader2 size={14} className="text-muted-foreground animate-spin flex-shrink-0" />
            : <Search size={14} className="text-muted-foreground flex-shrink-0" />}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search employees, modules, actions..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
          />
          <kbd className="text-[9px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin py-2">
          {allResults.length === 0 && query.length > 0 && !searching && (
            <div className="text-center py-8 text-sm text-muted-foreground">No results for "{query}"</div>
          )}

          {employees.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Employees</div>
              {employees.map((emp, i) => {
                const idx = i
                const isSelected = selected === idx
                return (
                  <button key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${isSelected ? 'bg-gold-500/5' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/80 to-teal-500/80 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{emp.first_name} {emp.last_name}</div>
                      <div className="text-xs text-muted-foreground">{emp.employee_code} · {(emp.departments as any)?.name}</div>
                    </div>
                    {isSelected && <ArrowRight size={12} className="text-gold-500 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {filteredCommands.length > 0 && (
            <div>
              {employees.length > 0 && (
                <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Navigation</div>
              )}
              {filteredCommands.map((cmd, i) => {
                const idx      = employees.length + i
                const isSelected = selected === idx
                return (
                  <button key={cmd.href} onClick={() => navigate(cmd.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${isSelected ? 'bg-gold-500/5' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-gold-500/20 text-gold-500' : 'bg-muted text-muted-foreground'}`}>
                      <cmd.icon size={13} />
                    </div>
                    <span className="text-sm text-foreground">{cmd.label}</span>
                    {isSelected && <ArrowRight size={12} className="text-gold-500 ml-auto flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↵</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
