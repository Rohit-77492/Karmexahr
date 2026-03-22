import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const clockInSchema = z.object({
  company_id: z.string().uuid(),
  type:       z.enum(['present','wfh','on_duty','half_day']).default('present'),
  location:   z.object({ lat: z.number(), lng: z.number(), address: z.string().optional() }).optional(),
})

const clockOutSchema = z.object({
  attendance_id: z.string().uuid(),
  location:      z.object({ lat: z.number(), lng: z.number(), address: z.string().optional() }).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const action = body.action as 'clock_in' | 'clock_out'
  const today  = new Date().toISOString().split('T')[0]

  if (action === 'clock_in') {
    const parsed = clockInSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    // Get employee
    const { data: emp } = await supabase.from('employees')
      .select('id').eq('user_id', user.id).eq('company_id', parsed.data.company_id).single()
    if (!emp) return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })

    // Check already clocked in
    const { data: existing } = await supabase.from('attendance')
      .select('id, clock_in').eq('employee_id', emp.id).eq('date', today).single()

    if (existing?.clock_in) return NextResponse.json({ error: 'Already clocked in today' }, { status: 409 })

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null

    const { data, error } = await supabase.from('attendance').upsert({
      company_id:  parsed.data.company_id,
      employee_id: emp.id,
      date:        today,
      clock_in:    new Date().toISOString(),
      type:        parsed.data.type,
      source:      'web',
      location:    parsed.data.location ?? null,
      ip_address:  ip,
    }, { onConflict: 'employee_id,date' }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, message: `Clocked in at ${new Date().toLocaleTimeString('en-IN')}` })
  }

  if (action === 'clock_out') {
    const parsed = clockOutSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { data, error } = await supabase.from('attendance')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', parsed.data.attendance_id)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      data,
      message: `Clocked out at ${new Date().toLocaleTimeString('en-IN')}`,
      total_hours: data.total_hours,
    })
  }

  return NextResponse.json({ error: 'Invalid action. Use clock_in or clock_out.' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const company_id  = searchParams.get('company_id')
  const employee_id = searchParams.get('employee_id')
  const date        = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  let query = supabase.from('attendance').select('*').eq('company_id', company_id)
  if (employee_id) query = query.eq('employee_id', employee_id)
  query = query.eq('date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
