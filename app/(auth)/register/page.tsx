'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, Check } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Need at least one uppercase letter')
    .regex(/[0-9]/, 'Need at least one number'),
  agree:     z.boolean().refine(v => v, 'You must accept the terms'),
})

type RegisterForm = z.infer<typeof schema>

const PASSWORD_CHECKS = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
]

export default function RegisterPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  })
  const password = watch('password', '')

  const onSubmit = async (values: RegisterForm) => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Account created! Check your email to verify.')
    router.push('/onboarding')
  }

  const googleSignUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
  }

  const inputCls = "w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
  const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-orange-600 flex items-center justify-center font-display font-black text-lg text-background shadow-lg">Kx</div>
          <div>
            <div className="font-display font-bold text-lg text-foreground">KarmexaHR</div>
            <div className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold">Enterprise HRMS</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h1 className="font-display text-2xl font-bold mb-1">Create workspace</h1>
          <p className="text-muted-foreground text-sm mb-8">Free to start · No credit card required</p>

          <button onClick={googleSignUp}
            className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-3 px-4 text-sm font-medium hover:bg-muted/50 transition-colors mb-6">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
              <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/>
              <path d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#FBBC05"/>
              <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} placeholder="Priya Sharma" {...register('full_name')} />
              {errors.full_name && <p className="text-destructive text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Work Email</label>
              <input type="email" className={inputCls} placeholder="priya@company.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className={`${inputCls} pr-12`} placeholder="••••••••" {...register('password')} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength */}
              {password && (
                <div className="flex gap-3 mt-2">
                  {PASSWORD_CHECKS.map(chk => (
                    <div key={chk.label} className={`flex items-center gap-1 text-[10px] ${chk.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                      <Check size={9} className={chk.test(password) ? 'opacity-100' : 'opacity-30'} />
                      {chk.label}
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div className="flex items-start gap-2.5">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-yellow-500" {...register('agree')} />
              <label className="text-xs text-muted-foreground leading-relaxed">
                I agree to KarmexaHR's{' '}
                <Link href="/terms" className="text-gold-500 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-gold-500 hover:underline">Privacy Policy</Link>
              </label>
            </div>
            {errors.agree && <p className="text-destructive text-xs">{errors.agree.message}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-gold-500/20">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-gold-500 font-medium hover:text-gold-400">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
