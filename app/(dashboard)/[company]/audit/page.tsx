'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { Shield, Search, Filter, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { formatDate, getAvatarColor } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const ACTION_COLORS: Record<string, string> = {
  INSERT:         'text-green-500 bg-green-500/10',
  UPDATE:         'text-blue-400 bg-blue-400/10',
  DELETE:         'text-destructive bg-destructive/10',
  SALARY_REVISED: 'text-gold-500 bg-gold-500/10',
}

const ENTITY_ICONS: Record<string, string> = {
  employees:     '👤',
  payslips:      '💰',
  leave_requests:'📅',
  attendance:    '⏰',
  companies:     '🏢',
  expense_claims:'🧾',
}

export default function AuditLogPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId]  = useState('')
  const [logs, setLogs]            = useState<any[]>([])
  const [loading, setLoading]      = useState(true)
  const [search, setSearch]        = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expanded, setExpanded]    = useState<string | null>(null)
  const [page, setPage]            = useState(1)
  const PAGE_SIZE = 25

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  const fetchLogs = useCallback(async () => {
    if (!companyId) return
    setLoading(true)

    let q = supabase.from('audit_logs')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (entityFilter) q = q.eq('entity_type', entityFilter)
    if (actionFilter) q = q.eq('action', actionFilter)
    if (search)       q = q.ilike('entity_type', `%${search}%`)

    const { data } = await q
    setLogs(data ?? [])
    setLoading(false)
  }, [companyId, page, search, entityFilter, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const entities    = ['employees','payslips','leave_requests','attendance','companies','expense_claims']
  const actions     = ['INSERT','UPDATE','DELETE','SALARY_REVISED']

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Shield size={18} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete activity trail with before/after values</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={12} className="text-muted-foreground" />
          <input type="text" placeholder="Search entity type..." className="bg-transparent text-xs outline-none w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500"
          value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">All Entities</option>
          {entities.map(e => <option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
        </select>
        <select className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500"
          value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || entityFilter || actionFilter) && (
          <button onClick={() => { setSearch(''); setEntityFilter(''); setActionFilter('') }}
            className="text-xs text-destructive hover:underline">Clear</button>
        )}
      </div>

      {/* Log table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No audit logs found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['','Time','User','Action','Entity','ID',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const profile  = log.profiles
                const isExpanded = expanded === log.id
                const color    = getAvatarColor(profile?.full_name ?? 'System')
                const initials = (profile?.full_name ?? 'SYS').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()

                return (
                  <>
                    <tr key={log.id}
                      className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}
                      onClick={() => setExpanded(isExpanded ? null : log.id)}>
                      <td className="pl-4 py-3">
                        <span className="text-base">{ENTITY_ICONS[log.entity_type] ?? '📋'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground font-medium flex items-center gap-1">
                          <Clock size={10} className="text-muted-foreground" />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{formatDate(log.created_at, 'dd MMM, HH:mm')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: color }}>
                            {initials}
                          </div>
                          <span className="text-xs text-foreground">{profile?.full_name ?? 'System'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{log.entity_type?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-muted-foreground">{log.entity_id?.slice(0,8)}…</span>
                      </td>
                      <td className="px-4 py-3">
                        {isExpanded
                          ? <ChevronDown size={13} className="text-muted-foreground" />
                          : <ChevronRight size={13} className="text-muted-foreground" />}
                      </td>
                    </tr>

                    {/* Expanded diff view */}
                    {isExpanded && (log.old_values || log.new_values) && (
                      <tr key={`${log.id}-expanded`} className="border-b border-border/50 bg-muted/10">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {log.old_values && (
                              <div>
                                <div className="text-[9px] font-bold text-destructive uppercase tracking-wide mb-2">Before</div>
                                <pre className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-[10px] text-muted-foreground overflow-x-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <div className="text-[9px] font-bold text-green-500 uppercase tracking-wide mb-2">After</div>
                                <pre className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-[10px] text-muted-foreground overflow-x-auto">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                          {log.ip_address && (
                            <div className="mt-2 text-[10px] text-muted-foreground">
                              IP: {log.ip_address} · User Agent: {log.user_agent?.slice(0, 60)}…
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded-lg border border-border text-xs hover:bg-muted disabled:opacity-40">← Prev</button>
            <button disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-lg border border-border text-xs hover:bg-muted disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
