import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/resend'
import { z } from 'zod'

const schema = z.object({
  email:      z.string().email(),
  company_id: z.string().uuid(),
  role:       z.enum(['admin','hr_manager','manager','employee']).default('employee'),
  employee_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { email, company_id, role, employee_id } = parsed.data

  // Check inviter has admin permissions
  const { data: member } = await supabase.from('company_members')
    .select('role').eq('user_id', user.id).eq('company_id', company_id).single()

  if (!member || !['super_admin','admin','hr_manager'].includes(member.role)) {
    return NextResponse.json({ error: 'Only admins and HR managers can invite staff' }, { status: 403 })
  }

  // Get company name for email
  const { data: company } = await supabase.from('companies').select('name, slug').eq('id', company_id).single()
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  // Use admin client to invite user via Supabase Auth
  const admin = createAdminClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite`,
    data: { company_id, company_name: company.name },
  })

  if (inviteError) {
    // If user already exists, just add them to the company
    if (inviteError.message.includes('already been registered')) {
      const { data: existingUser } = await admin.auth.admin.listUsers()
      const found = existingUser.users.find(u => u.email === email)

      if (found) {
        await supabase.from('company_members').upsert({
          company_id, user_id: found.id, role, is_active: true,
        }, { onConflict: 'company_id,user_id' })

        if (employee_id) {
          await supabase.from('employees').update({ user_id: found.id }).eq('id', employee_id)
        }

        return NextResponse.json({ success: true, message: 'Existing user added to company' })
      }
    }
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // Pre-create company membership (will be confirmed on first login)
  if (invited.user) {
    await admin.from('company_members').insert({
      company_id,
      user_id: invited.user.id,
      role,
      is_active: false, // activated on invite acceptance
    })

    // Link to employee record if provided
    if (employee_id) {
      await admin.from('employees').update({ user_id: invited.user.id }).eq('id', employee_id)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Invitation sent to ${email}`,
    user_id: invited.user?.id,
  })
}
