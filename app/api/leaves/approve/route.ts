import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLeaveDecisionEmail } from '@/lib/email/resend'
import { z } from 'zod'

const schema = z.object({
  request_id: z.string().uuid(),
  action:     z.enum(['approved', 'rejected']),
  note:       z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { request_id, action, note } = parsed.data

  // Get the leave request
  const { data: request } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employees!inner(
        id, first_name, last_name, email, company_id, manager_id,
        user_id
      ),
      leave_policies(name, leave_type)
    `)
    .eq('id', request_id)
    .single()

  if (!request) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

  const emp = (request as any).employees

  // Check permissions: must be HR/admin or the employee's manager
  const { data: reviewerEmp } = await supabase.from('employees')
    .select('id').eq('user_id', user.id).eq('company_id', emp.company_id).single()

  const { data: memberRole } = await supabase.from('company_members')
    .select('role').eq('user_id', user.id).eq('company_id', emp.company_id).single()

  const isHR      = ['super_admin','admin','hr_manager'].includes(memberRole?.role ?? '')
  const isManager = reviewerEmp && emp.manager_id === reviewerEmp.id

  if (!isHR && !isManager) {
    return NextResponse.json({ error: 'Not authorized to review this request' }, { status: 403 })
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: `Request is already ${request.status}` }, { status: 409 })
  }

  // Update request
  const { error } = await supabase.from('leave_requests').update({
    status:      action,
    reviewed_by: reviewerEmp?.id ?? null,
    reviewed_at: new Date().toISOString(),
    review_note: note ?? null,
  }).eq('id', request_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email notification to employee
  try {
    const policy   = (request as any).leave_policies
    const reviewer = await supabase.auth.getUser()
    await sendLeaveDecisionEmail(
      emp.email,
      `${emp.first_name} ${emp.last_name}`,
      action,
      policy?.name ?? request.leave_type,
      request.from_date,
      request.to_date,
      request.days,
      reviewer.data.user?.user_metadata?.full_name ?? 'Manager',
      note,
    )
  } catch (emailErr) {
    // Don't fail the API call for email errors
    console.error('Email send failed:', emailErr)
  }

  // Create notification for employee
  if (emp.user_id) {
    await supabase.from('notifications').insert({
      user_id:    emp.user_id,
      company_id: emp.company_id,
      type:       `leave_${action}`,
      title:      `Leave request ${action}`,
      body:       `Your ${(request as any).leave_policies?.name ?? 'leave'} request has been ${action}`,
      data:       { request_id, action },
    })
  }

  return NextResponse.json({
    success: true,
    action,
    request_id,
  })
}
