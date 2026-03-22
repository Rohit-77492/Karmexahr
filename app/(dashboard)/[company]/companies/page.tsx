'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Building2, Users, CheckCircle, Settings, ExternalLink } from 'lucide-react'
import type { Company } from '@/lib/supabase/database.types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const COMPANY_COLORS = ['#f0a500','#00c9b1','#9b6dff','#ff5a65','#4d9fff','#22d07a','#ff8c00']

const schema = z.object({
  name:       z.string().min(2, 'Company name required'),
  slug:       z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  industry:   z.string().optional(),
  size_range: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  timezone:   z.string().default('Asia/Kolkata'),
  website:    z.string().url().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export default function CompaniesPage() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<(Company & { employee_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const fetchCompanies = async () => {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').eq('is_active', true).order('name')
    if (data) {
      // Get employee counts
      const counts = await Promise.all(
        data.map(c => supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', c.id).eq('status', 'active'))
      )
      setCompanies(data.map((c, i) => ({ ...c, employee_count: counts[i].count ?? 0 })))
    }
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Company Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.length} companies on KarmexaHR</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20"
        >
          <Plus size={13} /> Add Company
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-12 w-12 rounded-2xl bg-muted mb-4" />
              <div className="h-4 bg-muted rounded w-40 mb-2" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company, i) => {
            const color = COMPANY_COLORS[i % COMPANY_COLORS.length]
            const initials = company.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={company.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-colors group" style={{ borderTop: `3px solid ${color}` }}>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-extrabold text-lg text-white flex-shrink-0" style={{ background: `${color}30`, color }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm text-foreground truncate">{company.name}</div>
                      <div className="text-xs text-muted-foreground">{company.industry ?? 'General'} · {company.size_range ?? 'N/A'}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${company.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <div className="font-display font-extrabold text-xl text-foreground" style={{ color }}>
                        {company.employee_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Employees</div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <div className="font-display font-extrabold text-xl text-foreground capitalize">
                        {company.plan}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Plan</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                    {company.gst_number && <div className="flex gap-2"><span className="font-medium text-foreground/60">GST:</span> {company.gst_number}</div>}
                    {company.pan_number && <div className="flex gap-2"><span className="font-medium text-foreground/60">PAN:</span> {company.pan_number}</div>}
                    <div className="flex gap-2"><span className="font-medium text-foreground/60">TZ:</span> {company.timezone}</div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`/${company.slug}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink size={11} /> Switch To
                    </a>
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
                      <Settings size={11} /> Settings
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add new placeholder */}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-card border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-gold-500/30 hover:bg-gold-500/[0.02] transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-500 group-hover:bg-gold-500/20 transition-colors">
              <Plus size={24} />
            </div>
            <div className="text-sm font-semibold text-muted-foreground group-hover:text-gold-500 transition-colors">Add New Company</div>
            <div className="text-xs text-muted-foreground/60 text-center">Onboard another company onto KarmexaHR</div>
          </button>
        </div>
      )}

      {showAdd && <AddCompanyModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchCompanies() }} />}
    </div>
  )
}

function AddCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: 'Asia/Kolkata' },
  })

  const name = watch('name')
  useEffect(() => {
    if (name) setValue('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }, [name])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    const { error } = await supabase.from('companies').insert({
      ...values,
      plan: 'starter',
      max_employees: 50,
      fiscal_year_start: 4,
      work_week: ['Mon','Tue','Wed','Thu','Fri'],
      currency: 'INR',
    })
    if (error) { toast.error(error.message) }
    else { toast.success('Company created!'); onSuccess() }
    setLoading(false)
  }

  const inputCls = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
  const labelCls = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
  const errCls   = "text-destructive text-xs mt-1"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-display font-bold text-lg">Add New Company</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Company Name *</label>
            <input className={inputCls} placeholder="Acme Corp Pvt. Ltd." {...register('name')} />
            {errors.name && <p className={errCls}>{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>URL Slug * <span className="text-muted-foreground/50 normal-case tracking-normal">(used for app.karmexahr.com/<strong>slug</strong>)</span></label>
            <input className={inputCls} placeholder="acme-corp" {...register('slug')} />
            {errors.slug && <p className={errCls}>{errors.slug.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Industry</label>
              <select className={inputCls} {...register('industry')}>
                <option value="">Select</option>
                {['IT/Software','Manufacturing','Finance','Healthcare','Retail','Logistics','Education','Other'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Company Size</label>
              <select className={inputCls} {...register('size_range')}>
                <option value="">Select</option>
                {['1-10','11-50','51-200','201-500','500+'].map(s => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>GST Number</label>
              <input className={inputCls} placeholder="29AAFCT3518Q1ZH" {...register('gst_number')} />
            </div>
            <div>
              <label className={labelCls}>PAN Number</label>
              <input className={inputCls} placeholder="AAFCT3518Q" {...register('pan_number')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Timezone</label>
            <select className={inputCls} {...register('timezone')}>
              <option value="Asia/Kolkata">IST (UTC+5:30) — India</option>
              <option value="Asia/Dubai">GST (UTC+4) — Dubai</option>
              <option value="America/New_York">EST — New York</option>
              <option value="Europe/London">GMT — London</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold disabled:opacity-50 hover:opacity-90">
              {loading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
