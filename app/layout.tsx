import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import Providers from './providers'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: { default: 'KarmexaHR', template: '%s · KarmexaHR' },
  description: 'Enterprise HRMS for multi-company management — Attendance, Payroll, Recruitment, Performance',
  keywords: ['HRMS', 'HR Software', 'Payroll', 'Attendance', 'India', 'KarmexaHR'],
  authors: [{ name: 'KarmexaHR' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.karmexahr.com'),
  openGraph: {
    type: 'website',
    title: 'KarmexaHR',
    description: 'Enterprise HRMS for multi-company management',
    siteName: 'KarmexaHR',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0d14' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${syne.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Providers>
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
