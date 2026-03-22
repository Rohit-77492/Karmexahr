'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Error boundary caught:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Animated error icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-destructive/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle size={36} className="text-destructive" />
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          An unexpected error occurred. Our team has been notified and is working on a fix.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6 text-left">
            <div className="text-xs font-mono text-destructive break-all">{error.message}</div>
            {error.digest && <div className="text-[10px] text-muted-foreground mt-1">Digest: {error.digest}</div>}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} /> Try Again
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Home size={14} /> Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
