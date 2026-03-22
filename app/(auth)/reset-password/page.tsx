'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [pwd, setPwd]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Supabase handles the hash fragment automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is authenticated via recovery token, ready to set new password
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse({ password: pwd, confirm })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.issues.forEach(i => { errs[i.path[0]] = i.message })
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) {
      toast.error(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    }
    setLoading(false)
  }

  const checks = [
    { label: '8+ characters', pass: pwd.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(pwd) },
    { label: 'Number', pass: /[0-9]/.test(pwd) },
    { label: 'Passwords match', pass: pwd === confirm && confirm.length > 0 },
  ]

  const strength = checks.filter(c => c.pass).length
  const strengthColor = strength <= 1 ? '#ff5a65' : strength <= 2 ? '#f0a500' : strength <= 3 ? '#4d9fff' : '#22d07a'

  const inp = "w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-orange-600 flex items-center justify-center font-display font-black text-lg text-background shadow-lg">Kx</div>
          <div>
            <div className="font-display font-bold text-lg text-foreground">KarmexaHR</div>
            <div className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold">Enterprise HRMS</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {!done ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center mb-5">
                <Lock size={22} className="text-gold-500" />
              </div>
              <h1 className="font-display text-xl font-bold mb-1">Set New Password</h1>
              <p className="text-sm text-muted-foreground mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className={inp} placeholder="••••••••"
                      value={pwd} onChange={e => setPwd(e.target.value)} required />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Strength meter */}
                {pwd && (
                  <div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${strength * 25}%`, background: strengthColor }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {checks.map(c => (
                        <div key={c.label} className={`flex items-center gap-1.5 text-[10px] ${c.pass ? 'text-green-500' : 'text-muted-foreground'}`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.pass ? 'bg-green-500' : 'bg-muted'}`} />
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className={inp} placeholder="••••••••"
                      value={confirm} onChange={e => setConfirm(e.target.value)} required />
                  </div>
                  {errors.confirm && <p className="text-destructive text-xs mt-1">{errors.confirm}</p>}
                </div>

                <button type="submit" disabled={loading || strength < 3}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-gold-500/20">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-5 mx-auto">
                <CheckCircle size={22} className="text-green-500" />
              </div>
              <h1 className="font-display text-xl font-bold text-center mb-2">Password Updated!</h1>
              <p className="text-sm text-muted-foreground text-center">
                Your password has been changed. Redirecting to login...
              </p>
              <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full animate-[width_3s_linear]" style={{ animation: 'grow 3s linear forwards' }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
