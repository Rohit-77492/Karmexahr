// lib/supabase/server.ts — Server-side client (Server Components, Route Handlers, Actions)
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Suppress in Server Components (can't set cookies there)
          }
        },
      },
    }
  )
}

// Admin client — bypasses RLS (Edge Functions / server-side payroll)
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Get current session server-side
export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Get current user server-side
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { ...user, profile }
}

// Get user's companies
export async function getUserCompanies(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('company_members')
    .select('role, companies(*)')
    .eq('user_id', userId)
    .eq('is_active', true)

  return data?.map(m => ({ ...m.companies, role: m.role })) ?? []
}

// Get employee record for current user in a company
export async function getEmployeeForUser(companyId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('employees')
    .select(`
      *,
      departments(name),
      designations(name),
      manager:employees!manager_id(first_name, last_name)
    `)
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single()

  return data
}
