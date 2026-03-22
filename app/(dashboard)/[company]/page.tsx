import { createClient } from '@/lib/supabase/server'
import { formatINRCompact } from '@/lib/payroll/indian-compliance'
import DashboardClient from './dashboard-client'

export default async function DashboardPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companySlug } = await params
  const supabase = await createClient()

  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', companySlug)
    .single()

  if (!company) return <div className="p-6 text-muted-foreground">Company not found.</div>

  // Parallel data fetches
  const [
    { count: totalEmployees },
    { count: onLeave },
    { count: openPositions },
    { count: pendingLeaves },
    { count: pendingExpenses },
    { data: latestPayroll },
    { data: todayAttendance },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'active'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'approved')
      .gte('from_date', new Date().toISOString().split('T')[0])
      .lte('to_date', new Date().toISOString().split('T')[0]),
    supabase.from('jobs').select('*', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'open'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'pending'),
    supabase.from('expense_claims').select('*', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'submitted'),
    supabase.from('payroll_runs').select('total_gross, total_net, month, year, status')
      .eq('company_id', company.id).order('year', { ascending: false })
      .order('month', { ascending: false }).limit(1),
    supabase.from('attendance').select('type')
      .eq('company_id', company.id)
      .eq('date', new Date().toISOString().split('T')[0]),
  ])

  const presentToday = todayAttendance?.filter(a => ['present','wfh','on_duty'].includes(a.type)).length ?? 0
  const monthlyPayroll = latestPayroll?.[0]?.total_gross ?? 0

  const stats = {
    totalEmployees:   totalEmployees  ?? 0,
    presentToday,
    onLeave:          onLeave         ?? 0,
    openPositions:    openPositions   ?? 0,
    pendingLeaves:    pendingLeaves   ?? 0,
    pendingExpenses:  pendingExpenses ?? 0,
    monthlyPayroll,
    monthlyPayrollFmt: formatINRCompact(monthlyPayroll),
    attendancePct: totalEmployees ? Math.round((presentToday / (totalEmployees as number)) * 100) : 0,
  }

  return <DashboardClient company={company} stats={stats} />
}
