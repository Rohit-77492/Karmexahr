'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Shield, Bell, CreditCard, Globe, Save, Loader2 } from 'lucide-react'

const SETTING_TABS = [
  { id: 'general',    label: 'General',     icon: Building2 },
  { id: 'compliance', label: 'Compliance',  icon: Shield },
  { id: 'billing',    label: 'Billing',     icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function SettingsPage() {
  const params   = useParams()
  const supabase = createClient()
  const [tab, setTab]     = useState('general')
  const [company, setCompany] = useState<any>(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState<any>({})

  useEffect(() => {
    supabase.from('companies').select('*').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) { setCompany(data); setForm(data) } })
  }, [params.company])

  const handleSave = async () => {
    if (!company) return
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      name: form.name, website: form.website, industry: form.industry,
      timezone: form.timezone, fiscal_year_start: form.fiscal_year_start,
      gst_number: form.gst_number, pan_number: form.pan_number,
      cin_number: form.cin_number,
    }).eq('id', company.id)
    if (error) toast.error(error.message)
    else toast.success('Settings saved')
    setSaving(false)
  }

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  if (!company) return <div className="p-6 text-muted-foreground text-sm">Loading...</div>

  return (
    <div className="p-6 max-w-[900px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Company Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">{company.name}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20 disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 flex-shrink-0">
          <div className="space-y-0.5">
            {SETTING_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all ${tab === t.id ? 'bg-gold-500/10 text-gold-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-6">
          {tab === 'general' && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-base mb-4">Company Information</h2>
              <div>
                <label className={lbl}>Company Name</label>
                <input className={inp} value={form.name ?? ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Website</label>
                <input className={inp} placeholder="https://company.com" value={form.website ?? ''} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Industry</label>
                  <select className={inp} value={form.industry ?? ''} onChange={e => setForm((f: any) => ({ ...f, industry: e.target.value }))}>
                    {['IT/Software','Manufacturing','Finance','Healthcare','Retail','Logistics','Education','Other'].map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Timezone</label>
                  <select className={inp} value={form.timezone ?? 'Asia/Kolkata'} onChange={e => setForm((f: any) => ({ ...f, timezone: e.target.value }))}>
                    <option value="Asia/Kolkata">IST (UTC+5:30)</option>
                    <option value="America/New_York">EST (UTC-5)</option>
                    <option value="Europe/London">GMT (UTC+0)</option>
                    <option value="Asia/Dubai">GST (UTC+4)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Fiscal Year Start</label>
                <select className={inp} value={form.fiscal_year_start ?? 4} onChange={e => setForm((f: any) => ({ ...f, fiscal_year_start: parseInt(e.target.value) }))}>
                  {['January','February','March','April','July','October'].map((m, i) => {
                    const monthNum = [1,2,3,4,7,10][i]
                    return <option key={monthNum} value={monthNum}>{m}</option>
                  })}
                </select>
              </div>
              <div>
                <label className={lbl}>Work Week</label>
                <div className="flex gap-2 flex-wrap">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                    const active = (form.work_week ?? ['Mon','Tue','Wed','Thu','Fri']).includes(d)
                    return (
                      <button key={d} type="button"
                        onClick={() => {
                          const ww = form.work_week ?? ['Mon','Tue','Wed','Thu','Fri']
                          setForm((f: any) => ({ ...f, work_week: active ? ww.filter((x: string) => x !== d) : [...ww, d] }))
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-gold-500/10 text-gold-500 border-gold-500/30' : 'border-border text-muted-foreground hover:border-gold-500/20'}`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'compliance' && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-base mb-4">Indian Compliance & Tax</h2>
              <div className="bg-gold-500/5 border border-gold-500/20 rounded-xl p-4 text-xs text-muted-foreground mb-2">
                These details are used for statutory filings, payslip generation, and PF/ESI/TDS compliance.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>GST Number</label>
                  <input className={inp} placeholder="29AAFCT3518Q1ZH" value={form.gst_number ?? ''} onChange={e => setForm((f: any) => ({ ...f, gst_number: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className={lbl}>PAN Number</label>
                  <input className={inp} placeholder="AAFCT3518Q" value={form.pan_number ?? ''} onChange={e => setForm((f: any) => ({ ...f, pan_number: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className={lbl}>CIN Number</label>
                  <input className={inp} placeholder="U74999MH2020PTC123456" value={form.cin_number ?? ''} onChange={e => setForm((f: any) => ({ ...f, cin_number: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div className="border-t border-border pt-5">
                <div className="font-semibold text-sm mb-3">Enabled Compliance Modules</div>
                {[
                  { key: 'pf',  label: 'Provident Fund (PF)',       desc: 'Employee 12% + Employer 12%' },
                  { key: 'esi', label: 'ESI (ESIC)',                 desc: 'Applicable for gross ≤ ₹21,000' },
                  { key: 'tds', label: 'TDS (Income Tax)',          desc: 'New regime FY 2024-25' },
                  { key: 'pt',  label: 'Professional Tax',          desc: 'State-wise slab deduction' },
                  { key: 'gratuity', label: 'Gratuity Provisioning', desc: '4.81% of basic monthly' },
                ].map(item => {
                  const enabled = (form.settings?.compliance ?? ['pf','esi','tds','pt','gratuity']).includes(item.key)
                  return (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          const current = form.settings?.compliance ?? ['pf','esi','tds','pt','gratuity']
                          const next = enabled ? current.filter((x: string) => x !== item.key) : [...current, item.key]
                          setForm((f: any) => ({ ...f, settings: { ...(f.settings ?? {}), compliance: next } }))
                        }}
                        className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${enabled ? 'bg-gold-500' : 'bg-muted'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-base mb-4">Billing & Plan</h2>
              <div className="bg-gradient-to-br from-gold-500/10 to-orange-500/5 border border-gold-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-display font-bold text-lg capitalize">{company.plan} Plan</div>
                    <div className="text-xs text-muted-foreground mt-1">Up to {company.max_employees} employees</div>
                  </div>
                  <span className="bg-gold-500/20 text-gold-500 text-xs font-bold px-3 py-1 rounded-full">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Employees', `${company.max_employees}`], ['Modules', 'All 10'], ['Support', '24/7']].map(([l, v]) => (
                    <div key={l} className="text-center">
                      <div className="font-display font-bold text-xl text-foreground">{v}</div>
                      <div className="text-[10px] text-muted-foreground">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-sm mb-3">Upgrade Plan</div>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { name: 'Starter', price: '₹2,999', emp: '50', color: '#4d9fff' },
                    { name: 'Growth',  price: '₹7,999', emp: '200', color: '#f0a500' },
                    { name: 'Enterprise', price: 'Custom', emp: 'Unlimited', color: '#9b6dff' },
                  ].map(plan => (
                    <div key={plan.name} className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-gold-500/30 transition-colors">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{plan.name}</div>
                        <div className="text-xs text-muted-foreground">{plan.emp} employees</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-display font-bold text-base" style={{ color: plan.color }}>{plan.price}<span className="text-muted-foreground text-xs font-normal">/mo</span></div>
                        <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted">Upgrade</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-base mb-4">Notification Preferences</h2>
              {[
                { section: 'Leave', items: ['Leave request submitted', 'Leave approved/rejected', 'Leave balance low'] },
                { section: 'Payroll', items: ['Payroll processed', 'Payslip published', 'Payroll anomaly detected'] },
                { section: 'Recruitment', items: ['New candidate applied', 'Interview scheduled', 'Offer accepted/rejected'] },
                { section: 'Performance', items: ['Review cycle started', 'Review overdue', 'OKR update required'] },
              ].map(section => (
                <div key={section.section}>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{section.section}</div>
                  {section.items.map(item => (
                    <div key={item} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                      <span className="text-sm text-foreground">{item}</span>
                      <div className="flex gap-4">
                        {['Email', 'In-app'].map(channel => (
                          <label key={channel} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-3 h-3 accent-yellow-500" />
                            <span className="text-[10px] text-muted-foreground">{channel}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
