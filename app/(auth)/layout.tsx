import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'KarmexaHR — Sign In', template: '%s · KarmexaHR' },
  description: 'Sign in to your KarmexaHR workspace',
  robots: 'noindex, nofollow',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
