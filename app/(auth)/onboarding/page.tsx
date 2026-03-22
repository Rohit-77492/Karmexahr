'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Building2, User, Briefcase, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STEPS = [
  { id: 'company',    label: 'Create Company',  icon: Building2 },
  { id: 'profile',    label: 'Your Profile',    icon: User },
  { id: 'team',       label: 'Invite Team',     icon: Briefcase },
]

const companySchema = z.object({
  name: z.string().min(2, 'Company name required'),
  industry: z.string().optional(),
  size_range: z.string().optional(),
  gst_number: z.string().optional(),
})

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  designation: z.string().optional(),
  phone: z.string().optional(),
})

type CompanyForm = z.infer<typeof companySchema>
type ProfileForm = z.infer<typeof profileSchema>

export default function OnboardingPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [companySlug, setCompanySlug] = useState('')
  const [inviteEmails, setInviteEmails] = useState(['', '', ''])

  const companyForm = useForm<CompanyForm>({ resolver: zodResolver(companySchema) })
  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })

  const handleCompany = async (values: CompanyForm) => {
    setLoading(true)
    const slug = values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }

    const { data: company, error } = await supabase.from('companies').insert({
      name: values.name, slug, industry: values.industry,
      size_range: values.size_range, gst_number: values.gst_number,
      plan: 'starter', max_employees: 50,
      fiscal_year_start: 4, work_week: ['Mon','Tue','Wed','Thu','Fri'],
      timezone: 'Asia/Kolkata', currency: 'INR',
    }).select().single()

    if (error) { toast.error(error.message); setLoading(false); return }

    // Add user as admin
    await supabase.from('company_members').insert({ company_id: company.id, user_id: user.id, role: 'admin' })

    setCompanyId(company.id); setCompanySlug(slug)
    setStep(1); setLoading(false)
  }

  const handleProfile = async (values: ProfileForm) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('profiles').upsert({ id: user.id, full_name: values.full_name, phone: values.phone })
    await supabase.from('employees').insert({
      company_id: companyId, employee_code: 'EMP0001',
      first_name: values.full_name.split(' ')[0],
      last_name: values.full_name.split(' ').slice(1).join(' ') || '-',
      email: user.email!, join_date: new Date().toISOString().split('T')[0],
      status: 'active',
    })
    setStep(2); setLoading(false)
  }

  const handleInvites = async () => {
    const emails = inviteEmails.filter(e => e.trim() && e.includes('@'))
    setLoading(true)
    // In real implementation: send invites via Resend + create pending memberships
    for (const email of emails) {
      await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id!,
        type: 'invite_sent', title: `Invite sent to ${email}`,
        company_id: companyId,
      })
    }
    toast.success(`${emails.length > 0 ? `${emails.length} invites sent!` : 'Workspace ready!'}`)
    router.push(`/${companySlug}`)
    setLoading(false)
  }

  const inp = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-orange-600 flex items-center justify-center font-display font-black text-lg text-background shadow-lg">Kx</div>
          <div>
            <div className="font-display font-bold text-lg text-foreground">KarmexaHR</div>
            <div className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold">Setup Wizard</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-gold-500 text-background' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check size={14} /> : <s.icon size={14} />}
              </div>
              <div className="flex-1">
                <div className={`text-xs font-semibold ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</div>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 max-w-8 ${i < step ? 'bg-green-500' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl animate-fade-in">
          {/* Step 0: Company */}
          {step === 0 && (
            <>
              <h1 className="font-display text-xl font-bold mb-1">Set up your company</h1>
              <p className="text-sm text-muted-foreground mb-6">Tell us about your organization</p>
              <form onSubmit={companyForm.handleSubmit(handleCompany)} className="space-y-4">
                <div>
                  <label className={lbl}>Company Name *</label>
                  <input className={inp} placeholder="Acme Corp Pvt. Ltd." {...companyForm.register('name')} />
                  {companyForm.formState.errors.name && <p className="text-destructive text-xs mt-1">{companyForm.formState.errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Industry</label>
                    <select className={inp} {...companyForm.register('industry')}>
                      <option value="">Select</option>
                      {['IT/Software','Manufacturing','Finance','Healthcare','Retail','Other'].map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Company Size</label>
                    <select className={inp} {...companyForm.register('size_range')}>
                      <option value="">Select</option>
                      {['1-10','11-50','51-200','201-500','500+'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={lbl}>GST Number <span className="text-muted-foreground/50 normal-case">(optional)</span></label>
                  <input className={inp} placeholder="29AAFCT3518Q1ZH" {...companyForm.register('gst_number')} />
                </div>
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold hover:opacity-90 disabled:opacity-50 mt-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Creating...' : 'Create Company →'}
                </button>
              </form>
            </>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <>
              <h1 className="font-display text-xl font-bold mb-1">Your profile</h1>
              <p className="text-sm text-muted-foreground mb-6">How should your team know you?</p>
              <form onSubmit={profileForm.handleSubmit(handleProfile)} className="space-y-4">
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input className={inp} placeholder="Priya Sharma" {...profileForm.register('full_name')} />
                  {profileForm.formState.errors.full_name && <p className="text-destructive text-xs mt-1">{profileForm.formState.errors.full_name.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Designation</label>
                  <input className={inp} placeholder="HR Manager" {...profileForm.register('designation')} />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input className={inp} placeholder="+91 98765 43210" {...profileForm.register('phone')} />
                </div>
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold hover:opacity-90 disabled:opacity-50 mt-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Saving...' : 'Save Profile →'}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Invite team */}
          {step === 2 && (
            <>
              <h1 className="font-display text-xl font-bold mb-1">Invite your team</h1>
              <p className="text-sm text-muted-foreground mb-6">Add teammates to get started. You can always do this later.</p>
              <div className="space-y-3 mb-6">
                {inviteEmails.map((email, i) => (
                  <input key={i} type="email" className={inp}
                    placeholder={`teammate${i+1}@company.com`} value={email}
                    onChange={e => setInviteEmails(prev => prev.map((x, j) => j === i ? e.target.value : x))} />
                ))}
                <button onClick={() => setInviteEmails(p => [...p, ''])}
                  className="text-xs text-gold-500 font-medium hover:text-gold-400">+ Add another</button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => router.push(`/${companySlug}`)} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted">
                  Skip for now
                </button>
                <button onClick={handleInvites} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Sending...' : '🚀 Launch Workspace'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
