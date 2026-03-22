import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  company_id:      z.string().uuid(),
  first_name:      z.string().min(1),
  last_name:       z.string().min(1),
  email:           z.string().email(),
  phone:           z.string().optional(),
  department_id:   z.string().uuid().optional(),
  designation_id:  z.string().uuid().optional(),
  employment_type: z.enum(['full_time','part_time','contract','intern','consultant']).default('full_time'),
  join_date:       z.string(),
  work_location:   z.string().default('office'),
  pan_number:      z.string().optional(),
  bank_name:       z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc:       z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const company_id = searchParams.get('company_id')
  const search     = searchParams.get('search')
  const dept       = searchParams.get('department_id')
  const status     = searchParams.get('status')
  const page       = parseInt(searchParams.get('page') ?? '1')
  const pageSize   = parseInt(searchParams.get('pageSize') ?? '20')

  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  let query = supabase
    .from('employees')
    .select(`
      id, employee_code, first_name, last_name, email, phone,
      status, join_date, work_location, employment_type,
      avatar_url, created_at,
      departments(name),
      designations(name),
      manager:employees!manager_id(first_name, last_name)
    `, { count: 'exact' })
    .eq('company_id', company_id)
    .order('first_name')
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`)
  if (dept)   query = query.eq('department_id', dept)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Verify user has HR role in this company
  const { data: member } = await supabase.from('company_members')
    .select('role').eq('user_id', user.id).eq('company_id', parsed.data.company_id).single()

  if (!member || !['super_admin','admin','hr_manager'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Generate employee code
  const { data: code } = await supabase.rpc('generate_employee_code', {
    p_company_id: parsed.data.company_id
  })

  const { data: employee, error } = await supabase.from('employees').insert({
    ...parsed.data,
    employee_code: code ?? `EMP${Date.now()}`,
    status: 'active',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: employee }, { status: 201 })
}
