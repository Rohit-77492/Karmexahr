import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'KarmexaHR', template: '%s · KarmexaHR' },
  robots: 'noindex, nofollow',
}

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
