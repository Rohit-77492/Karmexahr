import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's primary company
  const { data: membership } = await supabase
    .from('company_members')
    .select('companies(slug)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  const slug = (membership?.companies as any)?.slug

  if (slug) {
    redirect(`/${slug}`)
  }

  // No company yet — go to onboarding
  redirect('/onboarding')
}
