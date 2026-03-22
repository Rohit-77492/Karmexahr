'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, Sitemap, Clock, CalendarMinus, Umbrella,
  Banknote, Receipt, UserPlus, TrendingUp, GraduationCap, Building2,
  Settings, Bell, Search, Plus, ChevronDown, LogOut, User,
  Menu, X, FileText, BarChart3, Shield,
} from 'lucide-react'

const NAV = [
  {
    section: 'Core',
    items: [
      { label: 'Dashboard',    href: '',              icon: LayoutDashboard },
      { label: 'Employees',    href: '/employees',    icon: Users,      badge: null },
      { label: 'Org Chart',    href: '/orgchart',     icon: Sitemap },
    ],
  },
  {
    section: 'Time & Leave',
    items: [
      { label: 'Attendance',       href: '/attendance',  icon: Clock },
      { label: 'Leave Management', href: '/leaves',      icon: CalendarMinus, badge: 'leaves' },
      { label: 'Holidays',         href: '/holidays',    icon: Umbrella },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Payroll',   href: '/payroll',   icon: Banknote },
      { label: 'Expenses',  href: '/expenses',  icon: Receipt,  badge: 'expenses' },
      { label: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    section: 'Growth',
    items: [
      { label: 'Recruitment',   href: '/recruitment',  icon: UserPlus },
      { label: 'Performance',   href: '/performance',  icon: TrendingUp },
      { label: 'Training',      href: '/training',     icon: GraduationCap },
      { label: 'Analytics',     href: '/analytics',    icon: BarChart3 },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Companies', href: '/companies',  icon: Building2 },
      { label: 'Settings',  href: '/settings',   icon: Settings },
    ],
  },
]

const COMPANIES = [
  { name: 'TechNova Solutions', slug: 'technova', color: '#f0a500' },
  { name: 'Apex Dynamics',      slug: 'apex',     color: '#00c9b1' },
  { name: 'BlueSky Ventures',   slug: 'bluesky',  color: '#9b6dff' },
  { name: 'FinEdge Corp',       slug: 'finedge',  color: '#ff5a65' },
  { name: 'Orion Logistics',    slug: 'orion',    color: '#4d9fff' },
]

interface Props {
  children: React.ReactNode
  params: { company: string }
}

export default function DashboardLayout({ children, params }: Props) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [user, setUser]               = useState<{ name: string; email: string; initials: string } | null>(null)
  const [pendingLeaves, setPendingLeaves] = useState(0)
  const [pendingExpenses, setPendingExpenses] = useState(0)

  const company = COMPANIES.find(c => c.slug === params.company) ?? COMPANIES[0]
  const base    = `/${params.company}`

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.full_name ?? user.email ?? 'User'
      const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      setUser({ name, email: user.email ?? '', initials })
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  const isActive = (href: string) => {
    const full = base + href
    if (href === '') return pathname === base || pathname === base + '/'
    return pathname.startsWith(full)
  }

  const getBadge = (key: string | null) => {
    if (key === 'leaves')   return pendingLeaves   > 0 ? pendingLeaves   : null
    if (key === 'expenses') return pendingExpenses > 0 ? pendingExpenses : null
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 z-50 flex flex-col
        bg-sidebar border-r border-sidebar-border
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-500 to-orange-600 flex items-center justify-center font-display font-black text-sm text-background shadow-md shadow-gold-500/30 flex-shrink-0">
            Kx
          </div>
          <div>
            <div className="font-display font-bold text-sm text-sidebar-foreground">KarmexaHR</div>
            <div className="text-[9px] text-gold-500 uppercase tracking-widest font-semibold">Enterprise HRMS</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Company Switcher */}
        <div className="px-3 py-2">
          <div
            className="relative bg-sidebar-accent border border-sidebar-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-gold-500/50 transition-colors"
            onClick={() => setCompanyOpen(!companyOpen)}
          >
            <div className="text-[9px] text-sidebar-foreground/40 uppercase tracking-widest font-bold mb-1">Active Company</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: company.color }} />
                <span className="text-xs font-semibold text-sidebar-foreground truncate">{company.name}</span>
              </div>
              <ChevronDown size={12} className={`text-sidebar-foreground/40 transition-transform ${companyOpen ? 'rotate-180' : ''}`} />
            </div>

            {companyOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar border border-sidebar-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                {COMPANIES.map(c => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    onClick={() => setCompanyOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-sidebar-accent transition-colors ${c.slug === params.company ? 'text-gold-500 bg-gold-500/5' : 'text-sidebar-foreground/70'}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.name}
                  </Link>
                ))}
                <div className="border-t border-sidebar-border mt-1 pt-1">
                  <button className="flex items-center gap-2 px-3 py-2 text-xs text-gold-500 font-medium hover:bg-sidebar-accent w-full transition-colors">
                    <Plus size={12} /> Add Company
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {NAV.map(group => (
            <div key={group.section} className="mb-3">
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                {group.section}
              </div>
              {group.items.map(item => {
                const active = isActive(item.href)
                const badge  = getBadge(item.badge ?? null)
                return (
                  <Link
                    key={item.href}
                    href={base + item.href}
                    className={`
                      relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                      transition-all duration-150 mb-0.5 group
                      ${active
                        ? 'bg-gold-500/10 text-gold-500 font-semibold'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r bg-gold-500" />
                    )}
                    <item.icon size={14} className="flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badge && (
                      <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.initials ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name ?? 'Loading...'}</div>
              <div className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email ?? ''}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-destructive"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 focus-within:border-gold-500/50 focus-within:ring-2 focus-within:ring-gold-500/20 transition-all">
            <Search size={13} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search employees, payslips..."
              className="bg-transparent text-xs outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
            <kbd className="text-[9px] text-muted-foreground border border-border rounded px-1 py-0.5 hidden lg:block">⌘K</kbd>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl bg-muted/50 border border-border hover:border-border/80 transition-colors"
              >
                <Bell size={15} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-display font-semibold text-sm">Notifications</span>
                    <button className="text-xs text-gold-500 font-medium">Mark all read</button>
                  </div>
                  {[
                    { icon: FileText, color: 'text-gold-500 bg-gold-500/10', title: 'Leave request submitted', body: 'Priya Sharma — 3 days', time: '2m ago', unread: true },
                    { icon: Banknote, color: 'text-green-500 bg-green-500/10', title: 'March payroll ready', body: '248 payslips generated', time: '1h ago', unread: true },
                    { icon: UserPlus, color: 'text-blue-400 bg-blue-400/10', title: 'New hire: Rahul Mehta', body: 'Software Engineer · Engineering', time: '3h ago', unread: false },
                    { icon: Shield, color: 'text-destructive bg-destructive/10', title: 'Document pending', body: '5 employees missing Aadhaar', time: 'Yesterday', unread: false },
                  ].map((n, i) => (
                    <div key={i} className={`flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50 ${n.unread ? 'bg-gold-500/[0.03]' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.color}`}>
                        <n.icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground">{n.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{n.body}</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</div>
                      </div>
                      {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick add */}
            <button className="flex items-center gap-1.5 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-gold-500/20">
              <Plus size={13} />
              <span className="hidden sm:inline">Add Employee</span>
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
              {user?.initials ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
