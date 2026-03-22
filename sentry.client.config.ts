import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate:   process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  debug: false,
  integrations: [
    Sentry.replayIntegration({
      maskAllText:   true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event) {
    // Strip auth tokens from breadcrumbs
    if (event.breadcrumbs?.values) {
      event.breadcrumbs.values = event.breadcrumbs.values.map(b => {
        if (b.data?.url?.includes('supabase')) {
          b.data = { url: b.data.url.split('?')[0] }
        }
        return b
      })
    }
    return event
  },
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    'AbortError',
    'ResizeObserver loop limit exceeded',
    'Non-Error exception captured',
  ],
})
