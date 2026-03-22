import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  company_id: z.string().uuid(),
  month:      z.number().int().min(1).max(12),
  year:       z.number().int().min(2020).max(2099),
  remarks:    z.string().optional(),
})

// POST /api/payroll/run — Creates a payroll run and processes it
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { company_id, month, year, remarks } = parsed.data

  // Check HR permission
  const { data: member } = await supabase.from('company_members')
    .select('role').eq('user_id', user.id).eq('company_id', company_id).single()

  if (!member || !['super_admin','admin','hr_manager'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions — HR Manager or above required' }, { status: 403 })
  }

  // Check for duplicate
  const { data: existing } = await supabase.from('payroll_runs')
    .select('id, status').eq('company_id', company_id).eq('month', month).eq('year', year).single()

  if (existing && existing.status !== 'draft') {
    return NextResponse.json({
      error: `Payroll for ${month}/${year} already exists with status: ${existing.status}`,
      existing_run_id: existing.id,
    }, { status: 409 })
  }

  // Create or reuse run record
  let runId = existing?.id
  if (!runId) {
    const { data: run, error: createErr } = await supabase.from('payroll_runs').insert({
      company_id,
      month,
      year,
      status:     'draft',
      remarks:    remarks ?? null,
      created_by: user.id,
    }).select('id').single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    runId = run.id
  }

  // Use admin client for payroll processing (bypasses RLS)
  const admin = createAdminClient()
  const { data: result, error: runErr } = await admin.rpc('process_payroll_run', {
    p_run_id:     runId,
    p_company_id: company_id,
  })

  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    run_id:  runId,
    ...result,
  }, { status: 201 })
}

// GET /api/payroll/run?company_id=... — List payroll runs
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const company_id = searchParams.get('company_id')
  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  const { data, error } = await supabase.from('payroll_runs')
    .select('*')
    .eq('company_id', company_id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
