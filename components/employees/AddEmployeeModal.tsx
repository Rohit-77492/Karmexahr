'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Loader2, User, Briefcase, CreditCard, MapPin } from 'lucide-react'

const schema = z.object({
  first_name:       z.string().min(1, 'Required'),
  last_name:        z.string().min(1, 'Required'),
  email:            z.string().email('Invalid email'),
  phone:            z.string().optional(),
  date_of_birth:    z.string().optional(),
  gender:           z.enum(['male','female','other','prefer_not_to_say']).optional(),
  department_id:    z.string().optional(),
  employment_type:  z.enum(['full_time','part_time','contract','intern','consultant']).default('full_time'),
  join_date:        z.string().min(1, 'Required'),
  work_location:    z.string().default('office'),
  pan_number:       z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc:        z.string().optional(),
  bank_name:        z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const TABS = [
  { id: 'personal',   label: 'Personal',   icon: User },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'bank',       label: 'Bank & Tax', icon: CreditCard },
]

interface Props {
  companyId: string
  departments: { id: string; name: string }[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddEmployeeModal({ companyId, departments, onClose, onSuccess }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('personal')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employment_type: 'full_time', work_location: 'office' },
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      // Generate employee code
      const { data: codeData } = await supabase.rpc('generate_employee_code', { p_company_id: companyId })

      const { error } = await supabase.from('employees').insert({
        ...values,
        company_id:    companyId,
        employee_code: codeData ?? `EMP${Date.now()}`,
        status:        'active',
      })

      if (error) throw error
      onSuccess()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 transition-all"
  const labelCls = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
  const errCls   = "text-destructive text-xs mt-1"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg">Add New Employee</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in the details to onboard a new team member</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-border flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-gold-500/10 text-gold-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* ── Personal ── */}
            {activeTab === 'personal' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input className={inputCls} placeholder="Priya" {...register('first_name')} />
                    {errors.first_name && <p className={errCls}>{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Last Name *</label>
                    <input className={inputCls} placeholder="Sharma" {...register('last_name')} />
                    {errors.last_name && <p className={errCls}>{errors.last_name.message}</p>}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Work Email *</label>
                  <input type="email" className={inputCls} placeholder="priya.sharma@company.com" {...register('email')} />
                  {errors.email && <p className={errCls}>{errors.email.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input className={inputCls} placeholder="+91 98765 43210" {...register('phone')} />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <input type="date" className={inputCls} {...register('date_of_birth')} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select className={inputCls} {...register('gender')}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </>
            )}

            {/* ── Employment ── */}
            {activeTab === 'employment' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Department</label>
                    <select className={inputCls} {...register('department_id')}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Employment Type *</label>
                    <select className={inputCls} {...register('employment_type')}>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Join Date *</label>
                    <input type="date" className={inputCls} {...register('join_date')} />
                    {errors.join_date && <p className={errCls}>{errors.join_date.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Work Location</label>
                    <select className={inputCls} {...register('work_location')}>
                      <option value="office">Office</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">
                    💡 After saving, you can assign a salary structure and manager from the employee profile page.
                  </p>
                </div>
              </>
            )}

            {/* ── Bank & Tax ── */}
            {activeTab === 'bank' && (
              <>
                <div>
                  <label className={labelCls}>PAN Number</label>
                  <input className={inputCls} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} {...register('pan_number')} />
                </div>
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input className={inputCls} placeholder="HDFC Bank" {...register('bank_name')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input className={inputCls} placeholder="123456789012" {...register('bank_account_number')} />
                  </div>
                  <div>
                    <label className={labelCls}>IFSC Code</label>
                    <input className={inputCls} placeholder="HDFC0001234" style={{ textTransform: 'uppercase' }} {...register('bank_ifsc')} />
                  </div>
                </div>
                <div className="bg-gold-500/5 border border-gold-500/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">
                    🔒 Bank details are encrypted at rest. Only HR admins and the employee can view these details.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
            <div className="flex gap-2">
              {TABS.map((tab, i) => (
                <div key={tab.id} className={`w-2 h-2 rounded-full ${activeTab === tab.id ? 'bg-gold-500' : 'bg-muted'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              {activeTab !== 'bank' ? (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['personal','employment','bank']
                    const next = tabs[tabs.indexOf(activeTab) + 1]
                    if (next) setActiveTab(next)
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-gold-500/20"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Adding...' : 'Add Employee'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
