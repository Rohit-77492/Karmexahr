import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  company_id:   z.string().uuid(),
  title:        z.string().min(1),
  category:     z.enum(['travel','meals','accommodation','equipment','internet','mobile','training','medical','other']),
  amount:       z.number().positive(),
  currency:     z.string().default('INR'),
  expense_date: z.string(),
  description:  z.string().optional(),
  receipt_url:  z.string().url().optional(),
})

const actionSchema = z.object({
  claim_id:         z.string().uuid(),
  action:           z.enum(['approve', 'reject', 'mark_paid']),
  rejection_reason: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const company_id  = searchParams.get('company_id')
  const status      = searchParams.get('status')
  const employee_id = searchParams.get('employee_id')

  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  let query = supabase
    .from('expense_claims')
    .select('*, employees(first_name, last_name, employee_code, departments(name))')
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })

  if (status)      query = query.eq('status', status)
  if (employee_id) query = query.eq('employee_id', employee_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()

  // Action mode
  if (body.action) {
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { claim_id, action, rejection_reason } = parsed.data
    const statusMap = { approve: 'approved', reject: 'rejected', mark_paid: 'paid' }

    const updates: Record<string, any> = { status: statusMap[action] }
    if (action === 'approve') updates.approved_at = new Date().toISOString()
    if (action === 'reject')  updates.rejection_reason = rejection_reason
    if (action === 'mark_paid') updates.paid_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('expense_claims')
      .update(updates)
      .eq('id', claim_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Create mode
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_id', parsed.data.company_id)
    .single()

  if (!emp) return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('expense_claims')
    .insert({ ...parsed.data, employee_id: emp.id, status: 'submitted' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
