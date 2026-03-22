'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Megaphone, Pin, Plus, X, Calendar, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const CATEGORY_COLORS: Record<string, string> = {
  general:  'bg-blue-500/10 text-blue-400',
  hr:       'bg-gold-500/10 text-gold-500',
  finance:  'bg-green-500/10 text-green-500',
  it:       'bg-purple-500/10 text-purple-400',
  holiday:  'bg-red-500/10 text-destructive',
  policy:   'bg-orange-500/10 text-orange-400',
}

interface Announcement {
  id:          string
  title:       string
  body:        string
  category:    string
  is_pinned:   boolean
  published_at: string
  expires_at?: string
  created_by:  string
  profiles?:   { full_name: string }
}

interface Props {
  compact?: boolean
}

export default function AnnouncementFeed({ compact = false }: Props) {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId]       = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [isHR, setIsHR]                 = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: company } = await supabase.from('companies').select('id').eq('slug', params.company as string).single()
      if (!company) return
      setCompanyId(company.id)

      // Check role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: member } = await supabase.from('company_members').select('role').eq('user_id', user.id).eq('company_id', company.id).single()
        setIsHR(['super_admin','admin','hr_manager'].includes(member?.role ?? ''))
      }

      // Load announcements
      const { data } = await supabase.from('announcements')
        .select('*, profiles(full_name)')
        .eq('company_id', company.id)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(compact ? 5 : 50)

      setAnnouncements((data ?? []) as Announcement[])
      setLoading(false)

      // Realtime
      supabase.channel(`announcements-${company.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: `company_id=eq.${company.id}` },
          payload => setAnnouncements(prev => [payload.new as Announcement, ...prev])
        ).subscribe()
    }
    init()
  }, [params.company])

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-24" />
      ))}
    </div>
  )

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl font-bold">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">{announcements.length} active announcements</p>
          </div>
          {isHR && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20">
              <Plus size={13} /> New Announcement
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Megaphone size={32} className="text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          </div>
        ) : announcements.map(ann => (
          <div key={ann.id} className={`bg-card border rounded-2xl p-5 transition-colors ${ann.is_pinned ? 'border-gold-500/20 bg-gold-500/[0.02]' : 'border-border hover:border-border/70'}`}>
            <div className="flex items-start gap-3">
              {/* Category icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[ann.category] ?? CATEGORY_COLORS.general}`}>
                <Megaphone size={15} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {ann.is_pinned && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-gold-500">
                      <Pin size={9} /> PINNED
                    </div>
                  )}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[ann.category] ?? CATEGORY_COLORS.general}`}>
                    {ann.category}
                  </span>
                  {ann.expires_at && (
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Calendar size={9} />
                      Expires {new Date(ann.expires_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-sm text-foreground mb-2">{ann.title}</h3>
                <p className={`text-xs text-muted-foreground leading-relaxed ${compact ? 'line-clamp-2' : ''}`}>{ann.body}</p>

                <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                  <span>{ann.profiles?.full_name ?? 'HR Team'}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(ann.published_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {compact && announcements.length > 0 && (
        <button className="w-full mt-3 text-xs text-gold-500 font-medium hover:text-gold-400 py-2">
          View all announcements →
        </button>
      )}

      {showAdd && (
        <AddAnnouncementModal
          companyId={companyId}
          onClose={() => setShowAdd(false)}
          onSuccess={(ann) => { setAnnouncements(prev => [ann, ...prev]); setShowAdd(false); toast.success('Announcement published!') }}
        />
      )}
    </div>
  )
}

function AddAnnouncementModal({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: (a: any) => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ title: '', body: '', category: 'general', is_pinned: false, expires_at: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.body) { toast.error('Title and body required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('announcements').insert({
      company_id:  companyId,
      title:       form.title,
      body:        form.body,
      category:    form.category,
      is_pinned:   form.is_pinned,
      expires_at:  form.expires_at || null,
      created_by:  user!.id,
      published_at: new Date().toISOString(),
    }).select('*, profiles(full_name)').single()
    if (error) toast.error(error.message)
    else onSuccess(data)
    setLoading(false)
  }

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-display font-bold text-lg">New Announcement</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Title *</label>
            <input className={inp} placeholder="Q2 All-Hands Meeting — April 15" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>Body *</label>
            <textarea className={inp} rows={4} placeholder="Details of the announcement..."
              value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Category</label>
              <select className={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['general','hr','finance','it','holiday','policy'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Expires On (optional)</label>
              <input type="date" className={inp} value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
            <span className="text-sm text-foreground">Pin this announcement (always shows at top)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
