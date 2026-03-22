'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  password:  z.string().min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Need uppercase letter')
    .regex(/[0-9]/, 'Need a number'),
})

type FormData = z.infer<typeof schema>

export default function InvitePage() {
  const supabase    = createClient()
  const router      = useRouter()
  const params      = useSearchParams()
  const [step, setStep]       = useState<'loading' | 'setup' | 'done' | 'error'>('loading')
  const [companyName, setCompanyName] = useState('')
  const [saving, setSaving]   = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    // Supabase auth handles the invite token from the URL hash automatically
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        if (!session?.user) return

        // Check if this user has a company membership pending
        const { data: membership } = await supabase
          .from('company_members')
          .select('companies(name)')
          .eq('user_id', session.user.id)
          .single()

        if (membership) {
          setCompanyName((membership.companies as any)?.name ?? 'your company')
          setStep('setup')
        } else {
          setStep('error')
        }
      }
    })

    // Timeout for loading state
    setTimeout(() => {
      if (step === 'loading') setStep('error')
    }, 10000)
  }, [])

  const onSubmit = async (values: FormData) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expired — try clicking the link again'); setSaving(false); return }

    // Update profile
    await supabase.from('profiles').upsert({
      id:        user.id,
      full_name: values.full_name,
    })

    // Update password
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) { toast.error(error.message); setSaving(false); return }

    setStep('done')
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inp = "w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
  const lbl = "block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-orange-600 flex items-center justify-center font-display font-black text-lg text-background shadow-lg">Kx</div>
          <div>
            <div className="font-display font-bold text-lg text-foreground">KarmexaHR</div>
            <div className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold">Enterprise HRMS</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Loading */}
          {step === 'loading' && (
            <div className="text-center py-6">
              <Loader2 size={32} className="animate-spin text-gold-500 mx-auto mb-4" />
              <h2 className="font-display font-bold text-lg mb-2">Verifying your invitation...</h2>
              <p className="text-sm text-muted-foreground">Please wait while we set up your account.</p>
            </div>
          )}

          {/* Setup */}
          {step === 'setup' && (
            <>
              <div className="flex items-center gap-3 mb-6 p-4 bg-gold-500/5 border border-gold-500/20 rounded-xl">
                <Building2 size={18} className="text-gold-500 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-foreground">Invited to {companyName}</div>
                  <div className="text-xs text-muted-foreground">Complete your profile to get started</div>
                </div>
              </div>

              <h1 className="font-display text-xl font-bold mb-1">Set up your account</h1>
              <p className="text-sm text-muted-foreground mb-6">Choose your display name and a secure password.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className={lbl}>Your Full Name</label>
                  <input className={inp} placeholder="Priya Sharma" {...register('full_name')} autoFocus />
                  {errors.full_name && <p className="text-destructive text-xs mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Create Password</label>
                  <input type="password" className={inp} placeholder="Min 8 chars, 1 uppercase, 1 number" {...register('password')} />
                  {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
                </div>
                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-gold-500/20">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Setting up...' : 'Complete Setup →'}
                </button>
              </form>
            </>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">You&apos;re all set! 🎉</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to your workspace...</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center py-6">
              <div className="text-3xl mb-4">❌</div>
              <h2 className="font-display font-bold text-lg mb-2">Invalid invitation</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This invitation link has expired or is invalid. Ask your HR team to resend it.
              </p>
              <a href="/login" className="text-gold-500 text-sm font-medium hover:underline">← Back to login</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
