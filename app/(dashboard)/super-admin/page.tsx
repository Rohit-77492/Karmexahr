import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuperAdminClient from './super-admin-client'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const [
    { data: companies, count: companyCount },
    { data: recentSignups },
    { count: totalUsers },
    { data: planDist },
  ] = await Promise.all([
    supabase.from('companies').select('*, company_members(count)', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, created_at, role').order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('plan'),
  ])

  const planCounts = (planDist ?? []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.plan] = (acc[c.plan] ?? 0) + 1
    return acc
  }, {})

  return (
    <SuperAdminClient
      companies={companies ?? []}
      recentSignups={recentSignups ?? []}
      stats={{
        totalCompanies: companyCount ?? 0,
        totalUsers:     totalUsers   ?? 0,
        planCounts,
      }}
    />
  )
}
