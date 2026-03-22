// supabase/functions/process-email-queue/index.ts
// Processes queued emails using Resend
// Deploy: supabase functions deploy process-email-queue
// Schedule: Every 5 minutes via Supabase Cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('EMAIL_FROM') ?? 'noreply@karmexahr.com'
const APP_URL        = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://app.karmexahr.com'

interface EmailPayload {
  template:    string
  to_email:    string
  subject:     string
  payload:     Record<string, unknown>
}

function buildHtml(template: string, data: Record<string, unknown>): string {
  const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:40px 20px`
  const cardStyle = `background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:580px;margin:0 auto`
  const headerStyle = `background:linear-gradient(135deg,#f0a500,#e08000);padding:28px 32px`
  const bodyStyle = `padding:32px`
  const btnStyle = `display:inline-block;background:linear-gradient(135deg,#f0a500,#e08000);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none`
  const footStyle = `background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;text-align:center;color:#999;font-size:11px`

  const header = `<div style="${headerStyle}"><span style="background:rgba(255,255,255,0.2);border-radius:10px;padding:8px 14px;font-weight:900;font-size:16px;color:#fff">Kx</span><span style="margin-left:12px;color:rgba(255,255,255,0.9);font-weight:600">KarmexaHR</span></div>`
  const footer = `<div style="${footStyle}">© ${new Date().getFullYear()} KarmexaHR · <a href="${APP_URL}/unsubscribe" style="color:#f0a500">Unsubscribe</a></div>`

  let body = ''

  switch (template) {
    case 'leave_request_manager':
      body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#111">New Leave Request 📅</h2>
        <p style="color:#555;font-size:14px">Hi ${data.manager_name},</p>
        <p style="color:#555;font-size:14px"><strong>${data.employee_name}</strong> has applied for <strong>${data.leave_type}</strong>.</p>
        <table style="background:#f9f9f9;border-radius:10px;padding:4px 16px;margin:16px 0;width:100%">
          <tr><td style="padding:8px 0;color:#999;font-size:13px;width:120px">From</td><td style="color:#333;font-size:13px;font-weight:600">${data.from_date}</td></tr>
          <tr><td style="padding:8px 0;color:#999;font-size:13px">To</td><td style="color:#333;font-size:13px;font-weight:600">${data.to_date}</td></tr>
          <tr><td style="padding:8px 0;color:#999;font-size:13px">Days</td><td style="color:#333;font-size:13px;font-weight:600">${data.days}</td></tr>
          ${data.reason ? `<tr><td style="padding:8px 0;color:#999;font-size:13px">Reason</td><td style="color:#333;font-size:13px">${data.reason}</td></tr>` : ''}
        </table>
        <a href="${APP_URL}/leaves" style="${btnStyle}">Review Request →</a>
      `
      break

    case 'leave_decision':
      const isApproved = data.status === 'approved'
      body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#111">Leave ${isApproved ? 'Approved ✅' : 'Rejected ❌'}</h2>
        <p style="color:#555;font-size:14px">Hi ${data.employee_name},</p>
        <p style="color:#555;font-size:14px">Your <strong>${data.leave_type}</strong> request has been <strong>${data.status}</strong>.</p>
        ${data.note ? `<div style="background:#f9f9f9;border-radius:10px;padding:12px 16px;margin:16px 0;color:#555;font-size:13px"><strong>Note:</strong> ${data.note}</div>` : ''}
        <a href="${APP_URL}/leaves" style="${btnStyle}">View Details →</a>
      `
      break

    case 'payslip_published':
      body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#111">Your Payslip is Ready 💰</h2>
        <p style="color:#555;font-size:14px">Hi ${data.employee_name},</p>
        <p style="color:#555;font-size:14px">Your payslip for <strong>${data.month}</strong> has been published.</p>
        <table style="background:#f9f9f9;border-radius:10px;padding:4px 16px;margin:16px 0;width:100%">
          <tr><td style="padding:8px 0;color:#999;font-size:13px;width:120px">Gross Pay</td><td style="color:#333;font-size:13px;font-weight:600">₹${Number(data.gross_pay).toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding:8px 0;color:#999;font-size:13px">Net Pay</td><td style="color:#22d07a;font-size:15px;font-weight:800">₹${Number(data.net_pay).toLocaleString('en-IN')}</td></tr>
        </table>
        <a href="${APP_URL}/payroll" style="${btnStyle}">Download Payslip →</a>
      `
      break

    default:
      body = `<p style="color:#555;font-size:14px">You have a new notification from KarmexaHR.</p><a href="${APP_URL}" style="${btnStyle}">View →</a>`
  }

  return `<!DOCTYPE html><html><body style="${baseStyle}"><div style="${cardStyle}">${header}<div style="${bodyStyle}">${body}</div>${footer}</div></body></html>`
}

serve(async (req) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Get pending emails (max 50 per run)
  const { data: emails, error } = await admin
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(50)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!emails?.length) return new Response(JSON.stringify({ processed: 0 }))

  let sent = 0, failed = 0

  for (const email of emails) {
    try {
      const html = buildHtml(email.template, email.payload)

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      email.to_email,
          subject: email.subject,
          html,
        }),
      })

      if (res.ok) {
        await admin.from('email_queue').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: email.attempts + 1,
        }).eq('id', email.id)
        sent++
      } else {
        const err = await res.text()
        await admin.from('email_queue').update({
          status: email.attempts >= 3 ? 'failed' : 'pending',
          attempts: email.attempts + 1,
          last_error: err,
          scheduled_at: new Date(Date.now() + (email.attempts + 1) * 5 * 60 * 1000).toISOString(), // backoff
        }).eq('id', email.id)
        failed++
      }
    } catch (e: any) {
      await admin.from('email_queue').update({
        status: 'failed',
        attempts: email.attempts + 1,
        last_error: e.message,
      }).eq('id', email.id)
      failed++
    }
  }

  return new Response(JSON.stringify({ processed: emails.length, sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
