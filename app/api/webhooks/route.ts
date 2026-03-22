import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// POST /api/webhooks — Handle Razorpay & Resend webhooks

export async function POST(req: NextRequest) {
  const provider = req.headers.get('x-webhook-provider') ?? req.nextUrl.searchParams.get('provider')
  const body     = await req.text()

  // ── RAZORPAY ────────────────────────────────────────────────
  if (provider === 'razorpay') {
    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

    // Verify signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const admin  = createAdminClient()

    if (event.event === 'payout.processed') {
      const payoutId = event.payload?.payout?.entity?.id
      const notes    = event.payload?.payout?.entity?.notes

      if (notes?.payroll_run_id) {
        await admin.from('payroll_runs').update({
          status:  'paid',
          paid_at: new Date().toISOString(),
        }).eq('id', notes.payroll_run_id)

        // Log to audit
        await admin.from('audit_logs').insert({
          action:      'payroll_paid',
          entity_type: 'payroll_runs',
          entity_id:   notes.payroll_run_id,
          new_values:  { payout_id: payoutId, status: 'paid' },
        })
      }
    }

    if (event.event === 'payout.failed') {
      const notes = event.payload?.payout?.entity?.notes
      if (notes?.payroll_run_id) {
        await admin.from('payroll_runs').update({ status: 'failed' }).eq('id', notes.payroll_run_id)
      }
    }

    return NextResponse.json({ received: true })
  }

  // ── RESEND (Email events) ────────────────────────────────────
  if (provider === 'resend') {
    const signature = req.headers.get('svix-signature')
    // Resend uses Svix for webhook verification
    // In production, verify the signature here

    const event = JSON.parse(body)

    // Log email events for analytics
    if (['email.bounced','email.spam_complaint'].includes(event.type)) {
      console.error('Email delivery issue:', event)
      // In production: update employee email status, notify HR
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ error: 'Unknown webhook provider' }, { status: 400 })
}
