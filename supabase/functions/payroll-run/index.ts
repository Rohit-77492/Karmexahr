// supabase/functions/payroll-run/index.ts
// Supabase Edge Function — Payroll processing with Indian compliance
// Deploy: supabase functions deploy payroll-run

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { run_id, company_id } = await req.json()
    if (!run_id || !company_id) {
      return new Response(JSON.stringify({ error: 'run_id and company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check user has HR role in this company
    const { data: membership } = await supabaseAdmin.from('company_members')
      .select('role').eq('user_id', user.id).eq('company_id', company_id).single()
    if (!membership || !['super_admin','admin','hr_manager'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Execute payroll run via stored procedure
    const { data: result, error } = await supabaseAdmin.rpc('process_payroll_run', {
      p_run_id: run_id,
      p_company_id: company_id,
    })

    if (error) throw error

    // Send email notifications to all employees
    if (result?.success) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        // Get all payslips for this run
        const { data: payslips } = await supabaseAdmin.from('payslips')
          .select('*, employees(email, first_name, last_name)')
          .eq('run_id', run_id).eq('is_published', false)

        if (payslips) {
          // Publish payslips
          await supabaseAdmin.from('payslips').update({ is_published: true, published_at: new Date().toISOString() })
            .eq('run_id', run_id)

          // Queue notification for each employee
          const notifications = payslips.map(ps => ({
            user_id: (ps.employees as any)?.id ?? user.id,
            company_id,
            type: 'payslip_published',
            title: `Your payslip is ready`,
            body: `Net pay: ₹${ps.net_pay?.toLocaleString('en-IN')}`,
            data: { run_id, payslip_id: ps.id },
          }))

          if (notifications.length > 0) {
            await supabaseAdmin.from('notifications').insert(notifications)
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
