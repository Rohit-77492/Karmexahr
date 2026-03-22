-- ============================================================
-- KarmexaHR — Migration 006: Notification Triggers & Email Queue
-- ============================================================

-- ─── EMAIL QUEUE ──────────────────────────────────────────────
-- Server-side email queue processed by Edge Functions

CREATE TABLE email_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  template    TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts    INTEGER DEFAULT 0,
  last_error  TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
-- Only service role can access email queue
CREATE POLICY "email_queue_service_only" ON email_queue FOR ALL USING (false);

-- ─── AUTO-NOTIFY ON LEAVE REQUEST ─────────────────────────────

CREATE OR REPLACE FUNCTION notify_leave_request()
RETURNS TRIGGER AS $$
DECLARE
  v_emp     employees%ROWTYPE;
  v_manager employees%ROWTYPE;
  v_policy  leave_policies%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get employee and their manager
    SELECT * INTO v_emp FROM employees WHERE id = NEW.employee_id;
    SELECT * INTO v_policy FROM leave_policies WHERE id = NEW.policy_id;

    -- Notify the manager
    IF v_emp.manager_id IS NOT NULL THEN
      SELECT * INTO v_manager FROM employees WHERE id = v_emp.manager_id;

      -- In-app notification to manager's user account
      IF v_manager.user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, company_id, type, title, body, data)
        VALUES (
          v_manager.user_id,
          NEW.company_id,
          'leave_submitted',
          v_emp.first_name || ' ' || v_emp.last_name || ' applied for leave',
          v_policy.name || ' · ' || NEW.days || ' day(s) · ' ||
            to_char(NEW.from_date, 'DD Mon') || ' - ' || to_char(NEW.to_date, 'DD Mon'),
          jsonb_build_object(
            'leave_request_id', NEW.id,
            'employee_id', NEW.employee_id,
            'days', NEW.days
          )
        );
      END IF;

      -- Queue email to manager
      INSERT INTO email_queue (to_email, subject, template, payload)
      VALUES (
        v_manager.email,
        v_emp.first_name || ' ' || v_emp.last_name || ' applied for ' || v_policy.name,
        'leave_request_manager',
        jsonb_build_object(
          'manager_name', v_manager.first_name,
          'employee_name', v_emp.first_name || ' ' || v_emp.last_name,
          'leave_type', v_policy.name,
          'from_date', NEW.from_date,
          'to_date', NEW.to_date,
          'days', NEW.days,
          'reason', COALESCE(NEW.reason, ''),
          'request_id', NEW.id
        )
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved','rejected') THEN
    -- Get employee
    SELECT * INTO v_emp FROM employees WHERE id = NEW.employee_id;
    SELECT * INTO v_policy FROM leave_policies WHERE id = NEW.policy_id;

    -- Notify employee
    IF v_emp.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, company_id, type, title, body, data)
      VALUES (
        v_emp.user_id,
        NEW.company_id,
        'leave_' || NEW.status,
        'Leave request ' || UPPER(NEW.status),
        v_policy.name || ' · ' || NEW.days || ' day(s) has been ' || NEW.status,
        jsonb_build_object(
          'leave_request_id', NEW.id,
          'status', NEW.status,
          'review_note', COALESCE(NEW.review_note, '')
        )
      );
    END IF;

    -- Queue email to employee
    INSERT INTO email_queue (to_email, subject, template, payload)
    VALUES (
      v_emp.email,
      'Your leave request has been ' || NEW.status,
      'leave_decision',
      jsonb_build_object(
        'employee_name', v_emp.first_name,
        'leave_type', v_policy.name,
        'status', NEW.status,
        'from_date', NEW.from_date,
        'to_date', NEW.to_date,
        'days', NEW.days,
        'note', COALESCE(NEW.review_note, '')
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_leave
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION notify_leave_request();

-- ─── AUTO-NOTIFY ON PAYSLIP PUBLISH ───────────────────────────

CREATE OR REPLACE FUNCTION notify_payslip_published()
RETURNS TRIGGER AS $$
DECLARE
  v_emp employees%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT OLD.is_published AND NEW.is_published THEN
    SELECT * INTO v_emp FROM employees WHERE id = NEW.employee_id;

    -- In-app notification
    IF v_emp.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, company_id, type, title, body, data)
      VALUES (
        v_emp.user_id,
        NEW.company_id,
        'payslip_published',
        'Your payslip for ' || to_char(make_date(NEW.year, NEW.month, 1), 'Month YYYY') || ' is ready',
        'Net pay: ₹' || to_char(NEW.net_pay, 'FM9,99,99,999'),
        jsonb_build_object('payslip_id', NEW.id, 'month', NEW.month, 'year', NEW.year)
      );
    END IF;

    -- Queue email
    INSERT INTO email_queue (to_email, subject, template, payload)
    VALUES (
      v_emp.email,
      'Your payslip for ' || to_char(make_date(NEW.year, NEW.month, 1), 'Month YYYY') || ' is ready',
      'payslip_published',
      jsonb_build_object(
        'employee_name', v_emp.first_name,
        'month', to_char(make_date(NEW.year, NEW.month, 1), 'Month YYYY'),
        'gross_pay', NEW.gross_earnings,
        'net_pay', NEW.net_pay,
        'payslip_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_payslip
  AFTER UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION notify_payslip_published();

-- ─── BIRTHDAY & ANNIVERSARY CRON (pg_cron) ───────────────────

-- Runs daily at 9 AM IST (3:30 AM UTC) to send birthday notifications
SELECT cron.schedule(
  'birthday-reminders',
  '30 3 * * *',
  $$
    SELECT notify_upcoming_events();
  $$
);

CREATE OR REPLACE FUNCTION notify_upcoming_events()
RETURNS VOID AS $$
DECLARE
  v_event RECORD;
BEGIN
  FOR v_event IN
    SELECT * FROM get_upcoming_events(NULL, 1) -- today only
  LOOP
    -- Find HR managers in the company to notify
    INSERT INTO notifications (user_id, company_id, type, title, body, data)
    SELECT
      cm.user_id,
      e.company_id,
      v_event.event_type,
      CASE v_event.event_type
        WHEN 'birthday'    THEN '🎂 ' || v_event.full_name || '''s birthday today!'
        WHEN 'anniversary' THEN '🎉 ' || v_event.full_name || ' · ' || v_event.detail
      END,
      'Don''t forget to wish them!',
      jsonb_build_object('employee_id', v_event.employee_id, 'event_type', v_event.event_type)
    FROM employees e
    JOIN company_members cm ON cm.company_id = e.company_id
      AND cm.role IN ('admin','hr_manager') AND cm.is_active = true
    WHERE e.id = v_event.employee_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── LEAVE BALANCE ACCRUAL (monthly, for monthly accrual type) ──

SELECT cron.schedule(
  'monthly-leave-accrual',
  '0 1 1 * *',  -- 1st of every month at 1 AM UTC
  $$
    INSERT INTO leave_balances (company_id, employee_id, policy_id, year, allocated)
    SELECT
      e.company_id,
      e.id,
      lp.id,
      EXTRACT(YEAR FROM NOW())::INTEGER,
      ROUND(lp.days_per_year / 12.0, 1)
    FROM employees e
    CROSS JOIN leave_policies lp
    WHERE e.status = 'active'
      AND lp.company_id = e.company_id
      AND lp.accrual_type = 'monthly'
      AND lp.is_active = true
    ON CONFLICT (employee_id, policy_id, year) DO UPDATE
    SET allocated = leave_balances.allocated + EXCLUDED.allocated;
  $$
);

-- ─── PROBATION REMINDER (weekly) ─────────────────────────────

SELECT cron.schedule(
  'probation-reminders',
  '0 9 * * 1',  -- Every Monday at 9 AM UTC
  $$
    INSERT INTO notifications (user_id, company_id, type, title, body, data)
    SELECT DISTINCT
      cm.user_id,
      e.company_id,
      'probation_due',
      'Probation review due: ' || e.first_name || ' ' || e.last_name,
      'Probation period ends on ' || to_char(e.join_date + interval '6 months', 'DD Mon YYYY'),
      jsonb_build_object('employee_id', e.id, 'due_date', e.join_date + interval '6 months')
    FROM employees e
    JOIN company_members cm ON cm.company_id = e.company_id
      AND cm.role IN ('admin','hr_manager') AND cm.is_active = true
    WHERE e.status = 'active'
      AND e.confirmation_date IS NULL
      AND (e.join_date + interval '6 months') BETWEEN NOW() AND NOW() + interval '14 days';
  $$
);
