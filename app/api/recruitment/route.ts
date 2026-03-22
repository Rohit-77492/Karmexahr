import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  company_id:           z.string().uuid(),
  job_id:               z.string().uuid(),
  first_name:           z.string().min(1),
  last_name:            z.string().min(1),
  email:                z.string().email(),
  phone:                z.string().optional(),
  current_company:      z.string().optional(),
  current_designation:  z.string().optional(),
  experience_years:     z.number().optional(),
  current_ctc:          z.number().optional(),
  expected_ctc:         z.number().optional(),
  notice_period:        z.number().optional(),
  source:               z.string().default('direct'),
  resume_url:           z.string().url().optional(),
  notes:                z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const company_id = searchParams.get('company_id')
  const job_id     = searchParams.get('job_id')
  const stage      = searchParams.get('stage')

  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  let query = supabase
    .from('candidates')
    .select('*, jobs(title, department_id, departments(name))')
    .eq('company_id', company_id)
    .order('applied_at', { ascending: false })

  if (job_id) query = query.eq('job_id', job_id)
  if (stage)  query = query.eq('stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('candidates')
    .insert({ ...parsed.data, stage: 'applied' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, stage, score, notes } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('candidates')
    .update({ stage, score, notes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
