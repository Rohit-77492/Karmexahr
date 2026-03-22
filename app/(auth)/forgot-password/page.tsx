'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

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
          {!sent ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center mb-5">
                <Mail size={22} className="text-gold-500" />
              </div>
              <h1 className="font-display text-xl font-bold mb-1">Forgot Password?</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your work email and we'll send a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Work Email</label>
                  <input
                    type="email"
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-gold-500/20"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-5">
                <CheckCircle size={22} className="text-green-500" />
              </div>
              <h1 className="font-display text-xl font-bold mb-1">Check your email</h1>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
              </p>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground mb-4">
                Didn't receive it? Check your spam folder, or{' '}
                <button onClick={() => setSent(false)} className="text-gold-500 hover:underline">try again</button>.
              </div>
              <button onClick={() => setSent(false)} className="w-full py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted/50">
                Send another link
              </button>
            </>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <Link href="/login" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground group">
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
