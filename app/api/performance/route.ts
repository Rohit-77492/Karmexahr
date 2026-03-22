import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const submitSchema = z.object({
  review_id:   z.string().uuid(),
  type:        z.enum(['self', 'manager']),
  rating:      z.number().min(1).max(5),
  goals:       z.array(z.object({
    title:    z.string(),
    progress: z.number().min(0).max(100),
    rating:   z.number().min(1).max(5).optional(),
  })).optional(),
  competencies: z.array(z.object({
    name:   z.string(),
    rating: z.number().min(1).max(5),
  })).optional(),
  strengths:   z.string().optional(),
  improvements:z.string().optional(),
  comments:    z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const company_id  = searchParams.get('company_id')
  const cycle_id    = searchParams.get('cycle_id')
  const employee_id = searchParams.get('employee_id')

  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  let query = supabase
    .from('performance_reviews')
    .select(`
      *,
      employees!employee_id(first_name, last_name, employee_code, departments(name)),
      reviewer:employees!reviewer_id(first_name, last_name),
      review_cycles(name, cycle_type, period_start, period_end)
    `)
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })

  if (cycle_id)    query = query.eq('cycle_id', cycle_id)
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
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { review_id, type, rating, goals, competencies, strengths, improvements, comments } = parsed.data

  const updates: Record<string, any> = {
    goals:        goals        ?? [],
    competencies: competencies ?? [],
    strengths,
    improvements,
    comments,
    submitted_at: new Date().toISOString(),
  }

  if (type === 'self') {
    updates.self_rating = rating
    updates.status      = 'manager_review'
  } else {
    updates.manager_rating = rating
    updates.status         = 'completed'
    updates.completed_at   = new Date().toISOString()
    // Compute overall as average
    const { data: current } = await supabase.from('performance_reviews').select('self_rating').eq('id', review_id).single()
    if (current?.self_rating) {
      updates.overall_rating = Math.round(((current.self_rating + rating) / 2) * 10) / 10
    } else {
      updates.overall_rating = rating
    }
  }

  const { data, error } = await supabase
    .from('performance_reviews')
    .update(updates)
    .eq('id', review_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
