'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck, Loader2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICONS: Record<string, string> = {
  leave_approved:     '✅',
  leave_rejected:     '❌',
  leave_submitted:    '📅',
  payslip_published:  '💰',
  expense_approved:   '✅',
  expense_rejected:   '❌',
  new_announcement:   '📢',
  review_due:         '📊',
  birthday:           '🎂',
  default:            '🔔',
}

interface Notification {
  id:         string
  type:       string
  title:      string
  body:       string | null
  is_read:    boolean
  created_at: string
  data:       Record<string, any>
}

interface Props {
  userId: string
}

export default function NotificationBell({ userId }: Props) {
  const supabase   = createClient()
  const [open, setOpen]         = useState(false)
  const [notifs, setNotifs]     = useState<Notification[]>([])
  const [loading, setLoading]   = useState(true)
  const [marking, setMarking]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  const fetchNotifs = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs((data ?? []) as Notification[])
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    fetchNotifs()

    // Realtime subscription
    const channel = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifs(prev => [payload.new as Notification, ...prev])
        // Browser notification (if permission granted)
        if (Notification.permission === 'granted' && (payload.new as Notification).title) {
          new Notification('KarmexaHR', {
            body: (payload.new as Notification).title,
            icon: '/icons/icon-192x192.png',
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    setMarking(true)
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setMarking(false)
  }

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifs() }}
        className="relative p-2 rounded-xl bg-muted/50 border border-border hover:border-border/80 transition-colors"
        aria-label={`${unread} unread notifications`}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-88 max-w-[92vw] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-gold-500" />
              <span className="font-display font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} disabled={marking}
                className="flex items-center gap-1 text-[10px] text-gold-500 font-medium hover:text-gold-400">
                {marking ? <Loader2 size={10} className="animate-spin" /> : <CheckCheck size={10} />}
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-10">
                <Bell size={32} className="text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors group ${!n.is_read ? 'bg-gold-500/[0.03]' : ''}`}
              >
                <div className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? TYPE_ICONS.default}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold text-foreground leading-snug ${!n.is_read ? 'font-bold' : ''}`}>
                    {n.title}
                  </div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground/50 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-gold-500 flex-shrink-0 mt-1" />}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border text-center">
              <button className="text-xs text-gold-500 font-medium hover:text-gold-400">View all notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
