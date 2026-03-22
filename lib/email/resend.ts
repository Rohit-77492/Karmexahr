// lib/email/resend.ts
// KarmexaHR — Transactional Email via Resend

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.EMAIL_FROM ?? 'noreply@karmexahr.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.karmexahr.com'

// ─── HELPER ──────────────────────────────────────────────────

function baseTemplate(content: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#f0a500,#e08000);padding:28px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="background:rgba(255,255,255,0.2);border-radius:10px;padding:8px 14px;font-weight:900;font-size:16px;color:#fff;letter-spacing:-0.5px">Kx</span></td>
              <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase">KarmexaHR</td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee;text-align:center;color:#999;font-size:11px">
          © ${new Date().getFullYear()} KarmexaHR · <a href="${APP_URL}/unsubscribe" style="color:#f0a500">Unsubscribe</a> · <a href="${APP_URL}/privacy" style="color:#f0a500">Privacy</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function h2(t: string) { return `<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">${t}</h2>` }
function p(t: string)  { return `<p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6">${t}</p>` }
function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#f0a500,#e08000);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:8px">${label}</a>`
}
function infoRow(label: string, value: string) {
  return `<tr><td style="padding:8px 0;color:#999;font-size:13px;width:140px">${label}</td><td style="padding:8px 0;color:#333;font-size:13px;font-weight:600">${value}</td></tr>`
}
function infoTable(...rows: string[]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:10px;padding:4px 16px;margin:16px 0">${rows.join('')}</table>`
}

// ─── WELCOME / ONBOARDING ────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, companyName: string, loginUrl: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to ${companyName} on KarmexaHR 🎉`,
    html: baseTemplate(
      h2(`Welcome aboard, ${name}! 👋`) +
      p(`You've been added to <strong>${companyName}</strong> on KarmexaHR. Your workspace is ready — track attendance, apply leaves, view payslips, and more.`) +
      infoTable(infoRow('Company', companyName), infoRow('Email', to)) +
      btn('Get Started →', loginUrl),
      'Welcome to KarmexaHR'
    ),
  })
}

// ─── LEAVE REQUEST CONFIRMATION ──────────────────────────────

export async function sendLeaveRequestEmail(
  to: string,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  days: number,
  reason: string,
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Leave Request Submitted — ${leaveType} (${days}d)`,
    html: baseTemplate(
      h2('Leave Request Submitted') +
      p(`Hi ${employeeName}, your leave request has been submitted and is awaiting manager approval.`) +
      infoTable(
        infoRow('Leave Type', leaveType),
        infoRow('From',       new Date(fromDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })),
        infoRow('To',         new Date(toDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })),
        infoRow('Days',       `${days} day${days > 1 ? 's' : ''}`),
        infoRow('Reason',     reason || '—'),
      ) +
      p('You will receive an email once your manager approves or rejects the request.') +
      btn('View Request →', `${APP_URL}/leaves`),
      'Leave Request Submitted'
    ),
  })
}

// ─── LEAVE APPROVAL / REJECTION ──────────────────────────────

export async function sendLeaveDecisionEmail(
  to: string,
  employeeName: string,
  decision: 'approved' | 'rejected',
  leaveType: string,
  fromDate: string,
  toDate: string,
  days: number,
  reviewerName: string,
  note?: string,
) {
  const isApproved = decision === 'approved'
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Leave ${isApproved ? 'Approved ✅' : 'Rejected ❌'} — ${leaveType}`,
    html: baseTemplate(
      h2(`Leave ${isApproved ? 'Approved ✅' : 'Rejected ❌'}`) +
      p(`Hi ${employeeName}, your leave request has been <strong>${decision}</strong> by ${reviewerName}.`) +
      infoTable(
        infoRow('Decision',   isApproved ? '✅ Approved' : '❌ Rejected'),
        infoRow('Leave Type', leaveType),
        infoRow('Dates',      `${new Date(fromDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} — ${new Date(toDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}`),
        infoRow('Days',       `${days}`),
        ...(note ? [infoRow('Note', note)] : []),
      ) +
      btn('View Details →', `${APP_URL}/leaves`),
      `Leave ${decision}`
    ),
  })
}

// ─── PAYSLIP PUBLISHED ───────────────────────────────────────

export async function sendPayslipEmail(
  to: string,
  employeeName: string,
  month: string,
  year: number,
  grossPay: number,
  netPay: number,
  payslipUrl: string,
) {
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', minimumFractionDigits:0 }).format(n)
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your Payslip for ${month} ${year} is Ready`,
    html: baseTemplate(
      h2(`Payslip — ${month} ${year}`) +
      p(`Hi ${employeeName}, your payslip for <strong>${month} ${year}</strong> has been published.`) +
      infoTable(
        infoRow('Month',        `${month} ${year}`),
        infoRow('Gross Pay',    fmt(grossPay)),
        infoRow('Net Take-Home', fmt(netPay)),
      ) +
      btn('Download Payslip →', payslipUrl),
      'Payslip Ready'
    ),
  })
}

// ─── BIRTHDAY REMINDER ───────────────────────────────────────

export async function sendBirthdayReminderEmail(
  to: string,        // HR/Manager
  employeeName: string,
  birthdayDate: string,
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎂 ${employeeName}'s Birthday is coming up!`,
    html: baseTemplate(
      h2(`🎂 Upcoming Birthday`) +
      p(`<strong>${employeeName}</strong>'s birthday is on <strong>${new Date(birthdayDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long' })}</strong>. Don't forget to wish them! 🎉`),
      'Birthday Reminder'
    ),
  })
}

// ─── NEW EMPLOYEE WELCOME (for HR) ───────────────────────────

export async function sendNewHireNotification(
  hrEmail: string,
  employeeName: string,
  designation: string,
  department: string,
  joinDate: string,
) {
  return resend.emails.send({
    from: FROM,
    to: hrEmail,
    subject: `New Hire: ${employeeName} joins on ${joinDate}`,
    html: baseTemplate(
      h2(`New Employee Onboarded 🎉`) +
      p(`A new employee has been added to your organization.`) +
      infoTable(
        infoRow('Name',        employeeName),
        infoRow('Designation', designation),
        infoRow('Department',  department),
        infoRow('Join Date',   new Date(joinDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })),
      ) +
      btn('View Employee Profile →', `${APP_URL}/employees`),
      'New Hire Notification'
    ),
  })
}

// ─── OTP / MAGIC LINK ────────────────────────────────────────

export async function sendOTPEmail(to: string, otp: string, expiresInMinutes: number = 10) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your KarmexaHR verification code: ${otp}`,
    html: baseTemplate(
      h2('Verification Code') +
      p('Use the code below to verify your KarmexaHR login. This code expires in <strong>' + expiresInMinutes + ' minutes</strong>.') +
      `<div style="background:#f9f9f9;border-radius:12px;padding:24px;text-align:center;margin:16px 0"><span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#111">${otp}</span></div>` +
      p('<small>If you didn\'t request this, you can safely ignore this email.</small>'),
      'Verification Code'
    ),
  })
}
