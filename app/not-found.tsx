import Link from 'next/link'
import { SearchX, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 visual */}
        <div className="relative mb-8">
          <div className="font-display font-black text-[120px] leading-none text-muted/20 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gold-500/10 flex items-center justify-center">
              <SearchX size={36} className="text-gold-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-orange-600 flex items-center justify-center font-display font-black text-sm text-background">
            Kx
          </div>
          <span className="font-display font-bold text-foreground">KarmexaHR</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-gold-500/20"
          >
            <Home size={14} /> Go to Dashboard
          </Link>
          <button
            onClick={() => history.back()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft size={14} /> Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
