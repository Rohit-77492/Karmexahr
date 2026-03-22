import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const start = Date.now()

  // Check Supabase connectivity
  let dbStatus = 'ok'
  let dbLatency = 0
  try {
    const supabase = await createClient()
    const dbStart  = Date.now()
    await supabase.from('companies').select('id').limit(1)
    dbLatency = Date.now() - dbStart
  } catch {
    dbStatus = 'error'
  }

  const totalLatency = Date.now() - start

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    services: {
      api:      { status: 'ok', latency_ms: totalLatency },
      database: { status: dbStatus, latency_ms: dbLatency },
    },
    environment: process.env.NODE_ENV,
  }, {
    status: dbStatus === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
